// src/screens/ChatScreen.js
import React from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import MessageBubble from "../components/MessageBubble";
import TagChip from "../components/TagChip";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING } from "../theme";

const QUICK_CHIPS = [
  "Add car",
  "Breakfast + Pool",
  "Under $1500",
  "Non-stop flights",
  "4+ star hotels",
];

// ---- helpers ----
const formatCurrency = (amount, currency = "USD") => {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  if (typeof amount === "number") return symbol + amount.toLocaleString();
  return symbol + amount;
};

// Example backend-like package we’ll inject when flow reaches “done”
const SAMPLE_PACKAGE = {
  package: {
    flight: {
      airline: "Qatar Airways",
      type: "Non-Stop",
      price: 980,
      currency: "USD",
      link: {
        url: "https://www.expedia.com/qatar-flight",
        provider: "Expedia",
      },
    },
    hotel: {
      name: "Souq View",
      rating: 4.4,
      amenities: ["breakfast", "pool"],
      price: 360,
      currency: "USD",
      link: {
        url: "https://www.booking.com/souq-view",
        provider: "Booking.com",
      },
    },
    car: {
      provider: "Hertz",
      category: "Compact",
      price: 92,
      currency: "USD",
      link: { url: "https://www.hertz.com/compact", provider: "Hertz" },
    },
    tour: {
      name: "Desert Safari Tour",
      included: true,
      link: { url: "https://www.tiqets.com/desert-safari", provider: "Tiqets" },
    },
    summary: {
      total_price: 1432,
      currency: "USD",
      under_budget: true,
    },
  },
};

class ChatScreenClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      isTyping: false,
      messages: [],
      phase: "awaiting_addons", // 'idle' | 'awaiting_dates' | 'awaiting_addons' | 'done'
    };
    this.flatListRef = React.createRef();
  }

  // smooth scroll to bottom
  scrollToEndSmooth = () => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        this.flatListRef.current?.scrollToEnd({ animated: true });
      });
    });
  };

  addMessage = (newMessage) => {
    const messageWithId = { ...newMessage, id: Date.now().toString() };
    this.setState((prevState) => ({
      messages: [...prevState.messages, messageWithId],
    }));
  };

  removeTypingIndicators = () => {
    this.setState((prevState) => ({
      messages: prevState.messages.filter((msg) => !msg.isTyping),
    }));
  };

  // tiny “NLU”
  normalize = (s) =>
    s.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

  // convert a backend response (like SAMPLE_PACKAGE) into chat text + internal links
  buildPackageMessage = (pkgRoot) => {
    const pkg = pkgRoot.package;
    const text =
      `Perfect 👌 Here’s your package:\n` +
      `Flight: ${pkg.flight.airline}, ${pkg.flight.type}, ${formatCurrency(
        pkg.flight.price,
        pkg.flight.currency
      )}\n` +
      `Hotel: ${pkg.hotel.name} ⭐${
        pkg.hotel.rating
      }, ${pkg.hotel.amenities.join(" + ")}, ${formatCurrency(
        pkg.hotel.price,
        pkg.hotel.currency
      )}\n` +
      `Car: ${pkg.car.provider} ${pkg.car.category}, ${formatCurrency(
        pkg.car.price,
        pkg.car.currency
      )}\n` +
      `Desert Safari Tour: ${
        pkg.tour.included ? "Included 🎟️" : "Optional"
      }\n` +
      `Total: ${formatCurrency(
        pkg.summary.total_price,
        pkg.summary.currency
      )} ${pkg.summary.under_budget ? "(under budget 🎉)" : ""}`;

    // INTERNAL links: no external navigation — MessageBubble should navigate to "ProviderPreview"
    const links = [
      {
        label: "Flight Link – Expedia",
        provider: pkg.flight.link.provider,
        type: "flight",
        payload: pkg.flight,
      },
      {
        label: "Hotel Link – Booking.com",
        provider: pkg.hotel.link.provider,
        type: "hotel",
        payload: pkg.hotel,
      },
      {
        label: "Car Link – Hertz",
        provider: pkg.car.link.provider,
        type: "car",
        payload: pkg.car,
      },
      {
        label: "Tour Link – Tiqets",
        provider: pkg.tour.link.provider,
        type: "tour",
        payload: pkg.tour,
      },
    ];

    return { text, links };
  };

  getBotReply = (raw) => {
    const text = this.normalize(raw);
    const { phase } = this.state;

    // 1) Initial intent: SF -> Doha in November
    const mentionsRoute =
      text.includes("san francisco") && text.includes("doha");
    const mentionsNov = text.includes("november");
    if (mentionsRoute && mentionsNov) {
      return {
        nextPhase: "awaiting_dates",
        reply: "Got it ✅ Can you confirm exact dates in November?",
      };
    }

    // 2) Dates: “Nov 10–15” variants
    const datesRegex = /(nov|november)\s*\d{1,2}\s*([-]|to)\s*\d{1,2}/i;
    if (phase === "awaiting_dates" && datesRegex.test(text)) {
      return {
        nextPhase: "awaiting_addons",
        reply:
          "Perfect 👌 Budget $1500 noted. Do you also want a rental car or attractions included?",
      };
    }

    // 3) Addons: car + desert safari
    const wantsCar = /(^|\s)(car|rental car|compact)(\s|$)/i.test(text);
    const wantsSafari = /(desert safari|safari tour)/i.test(text);
    if (phase === "awaiting_addons" && wantsCar && wantsSafari) {
      const { text: reply, links } = this.buildPackageMessage(SAMPLE_PACKAGE);
      return { nextPhase: "done", reply, links };
    }

    // 4) Fallback
    return {
      nextPhase: phase,
      reply: "Hi there! 👋 I'm TWOS, your travel planning assistant.",
    };
  };

  handleSend = () => {
    const { message, isTyping } = this.state;
    if (!message.trim() || isTyping) return;

    Keyboard.dismiss();

    // user bubble
    const userMessage = {
      role: "user",
      text: message,
      timestamp: new Date(),
    };
    this.addMessage(userMessage);

    // clear & typing
    this.setState({ message: "", isTyping: true });

    setTimeout(() => {
      // typing indicator (Lottie shown by MessageBubble when isTyping is true)
      this.addMessage({
        role: "bot",
        timestamp: new Date(),
        isTyping: true,
      });

      setTimeout(() => {
        // remove typing
        this.removeTypingIndicators();

        // scripted reply
        const { reply, links, nextPhase } = this.getBotReply(userMessage.text);

        this.addMessage({
          role: "bot",
          text: reply,
          links,
          timestamp: new Date(),
        });

        this.setState({ isTyping: false, phase: nextPhase }, () =>
          this.scrollToEndSmooth()
        );
      }, 1500);
    }, 800);
  };

  handleQuickChip = (chipText) => {
    this.setState({ message: chipText }, () => {
      setTimeout(() => this.handleSend(), 100);
    });
  };

  renderMessage = ({ item }) => {
    if (item.isTyping) {
      return <MessageBubble role="bot" isTyping />;
    }

    return (
      <MessageBubble
        role={item.role}
        text={item.text}
        time={item.timestamp}
        links={item.links}
        navigation={this.props.navigation}
      />
    );
  };

  render() {
    const { messages, message, isTyping } = this.state;

    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="Tell me your vibe"
                description="Try: 'SF → Doha, Nov 10–15, under $1500, pool + breakfast'"
              />
            </View>
          ) : (
            <FlatList
              ref={this.flatListRef}
              data={messages}
              renderItem={this.renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              onContentSizeChange={() => this.scrollToEndSmooth()}
            />
          )}

          {/* Footer (chips + input) in bottom safe area */}
          <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
            <View style={styles.quickChips}>
              {QUICK_CHIPS.map((chip, index) => (
                <TagChip
                  key={index}
                  text={chip}
                  onPress={() => this.handleQuickChip(chip)}
                />
              ))}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isTyping && styles.inputDisabled]}
                value={message}
                onChangeText={(text) => this.setState({ message: text })}
                placeholder="Message TWOS..."
                placeholderTextColor={COLORS.textMuted}
                onSubmitEditing={this.handleSend}
                editable={!isTyping}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={this.handleSend}
                style={[
                  styles.sendButton,
                  isTyping && styles.sendButtonDisabled,
                ]}
                disabled={isTyping}
              >
                <Send
                  size={24}
                  color={isTyping ? COLORS.textMuted : COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },

  messagesList: { flex: 1 },
  messagesContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },

  footerSafe: { backgroundColor: COLORS.background },

  quickChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: SPACING.md,
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    paddingBottom: 0,
    marginBottom: -15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    maxHeight: 100,
  },
  inputDisabled: { opacity: 0.5 },
  sendButton: {
    marginLeft: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: SPACING.sm,
  },
  sendButtonDisabled: { opacity: 0.5 },

  typingContainer: {
    marginVertical: SPACING.xs,
    alignSelf: "flex-start",
    maxWidth: "80%",
    paddingHorizontal: SPACING.md,
  },
  typingBubble: {
    padding: SPACING.md,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typingText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    fontStyle: "italic",
  },
});

export default ChatScreenClass;
