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
import { sendMessage } from "../lib/api"; // centralized api client

const QUICK_CHIPS = [
  "Add car",
  "Breakfast + Pool",
  "Under $1500",
  "Non-stop flights",
  "4+ star hotels",
];

class ChatScreenClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      isTyping: false,
      messages: [],
      phase: "idle",
      sessionId: null,
    };
    this.flatListRef = React.createRef();
  }

  // Unique id generator: timestamp + short random suffix
  generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // smooth scroll to bottom
  scrollToEndSmooth = () => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        this.flatListRef.current?.scrollToEnd({ animated: true });
      });
    });
  };

  /**
   * Add a message to state.messages
   * Accepts an object like { role, text, timestamp, isTyping, links, id? }
   * If id is not supplied, generate a unique one here.
   */
  addMessage = (newMessage) => {
    if (!newMessage || typeof newMessage !== "object") return;

    const messageWithId = {
      ...newMessage,
      id: newMessage.id || this.generateId(),
      timestamp: newMessage.timestamp || new Date(),
    };

    this.setState(
      (prevState) => ({
        messages: [...prevState.messages, messageWithId],
      }),
      () => {
        // ensure we scroll whenever a new message is added
        this.scrollToEndSmooth();
      }
    );
  };

  removeTypingIndicators = () => {
    this.setState((prevState) => ({
      messages: prevState.messages.filter((msg) => !msg.isTyping),
    }));
  };

  handleSend = async () => {
    const { message, isTyping, phase, sessionId } = this.state;
    if (!message || !message.trim() || isTyping) return;

    Keyboard.dismiss();

    // Add user bubble (unique id generated inside addMessage)
    this.addMessage({
      role: "user",
      text: message,
      timestamp: new Date(),
    });

    // clear input and flip typing state
    this.setState({ message: "", isTyping: true });

    // Add typing indicator (also unique)
    this.addMessage({
      role: "bot",
      text: null,
      timestamp: new Date(),
      isTyping: true,
    });

    try {
      // send to centralized API (lib/api)
      const apiResp = await sendMessage({ message, phase, sessionId });

      // remove typing indicator(s)
      this.removeTypingIndicators();

      // add bot textual reply
      if (apiResp.reply) {
        this.addMessage({
          role: "bot",
          text: apiResp.reply,
          timestamp: new Date(),
          links: apiResp.links || [],
        });
      }

      // if structured package present, add a follow-up message
      if (apiResp.package) {
        this.addMessage({
          role: "bot",
          text: "Package ready — open provider preview links below.",
          timestamp: new Date(),
          links: (apiResp.links || []).map((l) => ({
            label: l.label,
            provider: l.provider,
            type: l.type,
            payload: l.payload || l,
          })),
        });
      }

      // update phase/session and clear typing state
      this.setState({
        phase: apiResp.nextPhase || phase,
        sessionId: apiResp.sessionId || sessionId,
        isTyping: false,
      });
    } catch (err) {
      // API error: clear typing and show fallback message
      this.removeTypingIndicators();

      this.addMessage({
        role: "bot",
        text: "Sorry — couldn't reach the server. Check the mock server URL in lib/api.js or ensure it's running. Hi there! 👋 I'm TWOS, your travel planning assistant.",
        timestamp: new Date(),
      });

      this.setState({ isTyping: false });
    }
  };

  handleQuickChip = (chipText) => {
    this.setState({ message: chipText }, () => {
      setTimeout(() => this.handleSend(), 120);
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
              keyExtractor={(item) => item.id || item._localId}
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
