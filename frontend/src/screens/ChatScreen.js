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
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import MessageBubble from "../components/MessageBubble";
import TagChip from "../components/TagChip";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING } from "../theme";
import { sendMessage } from "../lib/api";

import PREFILL_OPTIONS from "../data/prefill_options.json";
import MISSING_PROMPTS from "../data/missing_prompts.json";
import GREETINGS from "../data/greetings.json";

/* ====== Config ====== */
const QUICK_CHIPS = [
  "Add car",
  "Breakfast + Pool",
  "Under $1500",
  "Non-stop flights",
  "4+ star hotels",
];

const MAX_LOCAL_SLOT_FILL_ATTEMPTS = 3; // per message, safety

/* ===== Helpers: local NLU & intents ===== */
const normalize = (s = "") =>
  s.toString().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

function isGreeting(text) {
  if (!text) return false;
  const t = normalize(text);
  const greetings = [
    "hi",
    "hello",
    "hey",
    "How are you",
    "hiya",
    "good morning",
    "good evening",
  ];
  return greetings.some((g) =>
    g.includes(" ") ? t.includes(g) : new RegExp(`\\b${g}\\b`).test(t)
  );
}

function isHowAreYou(text) {
  if (!text) return false;
  const t = normalize(text);
  return /\bHow are you\b|\bhow's it going\b|\bhow r u\b/.test(t);
}

// detect flight intent and extract simple things if possible
function detectFlightIntent(text) {
  if (!text) return null;
  const t = normalize(text);
  if (
    !/\b(book|want to book|i want to fly|i want to go|i want to travel|flight|fly|book flight)\b/.test(
      t
    )
  )
    return null;

  // try to capture "from X to Y"
  const route = text.match(
    /from\s+([a-zA-Z\s\.\,]+?)\s+(?:to|->|[-|→])\s+([a-zA-Z\s\.\,]+)/i
  );
  if (route) {
    const origin = route[1].trim();
    const dest = route[2].trim();
    return { intent: "book_flight", origin, destination: dest };
  }

  // try "to X" or "from X"
  const toMatch = text.match(/\bto\s+([a-zA-Z\s\.\,]+)/i);
  const fromMatch = text.match(/\bfrom\s+([a-zA-Z\s\.\,]+)/i);
  const origin = fromMatch ? fromMatch[1].trim() : null;
  const destination = toMatch ? toMatch[1].trim() : null;
  return { intent: "book_flight", origin, destination };
}

// small date extractor (month names + day range)
function extractDates(text) {
  if (!text) return null;
  const r1 = text.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[^\d]*\s*(\d{1,2})\s*(?:[-–—to]+\s*)(\d{1,2})/i
  );
  if (r1) {
    const month = r1[1];
    const start = `${month} ${r1[2]}`;
    const end = `${month} ${r1[3]}`;
    return { start, end };
  }
  const iso = text.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:to|[-–—])\s*(\d{4}-\d{2}-\d{2})/i
  );
  if (iso) return { start: iso[1], end: iso[2] };
  const single = text.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*(\d{1,2})/i
  );
  if (single) return { start: `${single[1]} ${single[2]}`, end: "" };
  return null;
}

function extractPax(text) {
  const result = { adults: null, kids: null };
  if (!text) return result;
  const mAdults = text.match(/(\d+)\s*(adults|adult)/i);
  if (mAdults) result.adults = parseInt(mAdults[1], 10);
  const mKids = text.match(/(\d+)\s*(kids|children|child)/i);
  if (mKids) result.kids = parseInt(mKids[1], 10);
  const mPax = text.match(/(\d+)\s*(passengers|pax)/i);
  if (mPax && result.adults == null) result.adults = parseInt(mPax[1], 10);
  return result;
}

function extractBudget(text) {
  if (!text) return null;
  const m =
    text.match(/\$\s?([0-9,]+)/i) ||
    text.match(/budget\s*[:\-]?\s*([0-9,]+)/i) ||
    text.match(/(\d{3,6})\s*(usd|dollars)?/i);
  if (!m) return null;
  const num = m[1].replace(/,/g, "");
  return parseInt(num, 10);
}

// Quick city/airport heuristic using PREFILL_OPTIONS lists
function detectCityOrAirport(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const key of [
    "origin_airport_code",
    "destination_airport_code",
    "destination_city_code",
  ]) {
    const arr = PREFILL_OPTIONS[key] || [];
    for (const candidate of arr) {
      if (candidate && t.includes(candidate.toLowerCase())) return candidate;
    }
  }
  return null;
}

/* ===== ChatScreen component ===== */
class ChatScreenClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      isTyping: false,
      messages: [],
      phase: "idle",
      sessionId: null,
      currentSlots: null,
      missing: [],
    };
    this.flatListRef = React.createRef();
    this._localFillAttempts = 0;
  }

  generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  scrollToEndSmooth = () => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        this.flatListRef.current?.scrollToEnd?.({ animated: true });
      });
    });
  };

  addMessage = (newMessage) => {
    if (!newMessage || typeof newMessage !== "object") return;
    const messageWithId = {
      ...newMessage,
      id: newMessage.id || this.generateId(),
      timestamp: newMessage.timestamp || new Date(),
    };
    this.setState(
      (prev) => ({ messages: [...prev.messages, messageWithId] }),
      () => this.scrollToEndSmooth()
    );
  };

  removeTypingIndicators = () => {
    this.setState((prev) => ({
      messages: prev.messages.filter((m) => !m.isTyping),
    }));
  };

  sendToServer = async (messageText) => {
    const { phase, sessionId, currentSlots } = this.state;
    const payload = {
      message: messageText,
      phase,
      sessionId,
      slots: currentSlots || {},
    };
    return sendMessage(payload);
  };

  // Local handler: greetings and simple flight intent
  handleLocalIntents = (rawText) => {
    const text = (rawText || "").trim();
    if (!text) return false;

    // Greetings
    if (isGreeting(text)) {
      this.addMessage({ role: "user", text });
      // pick a greeting reply
      const arr = GREETINGS.greetings || GREETINGS;
      const reply = arr[Math.floor(Math.random() * arr.length)];
      this.addMessage({ role: "bot", text: reply });
      this.setState({ message: "" });
      return true;
    }

    if (isHowAreYou(text)) {
      this.addMessage({ role: "user", text });
      const arr = GREETINGS.how_are_you || ["I'm good — ready to help!"];
      const reply = arr[Math.floor(Math.random() * arr.length)];
      this.addMessage({ role: "bot", text: reply });
      this.setState({ message: "" });
      return true;
    }

    // Flight intent
    const flight = detectFlightIntent(text);
    if (flight && flight.intent === "book_flight") {
      this.addMessage({ role: "user", text });

      // Build starting slots
      const baseSlots = {
        origin_airport_code: "",
        destination_airport_code: "",
        destination_city_code: "",
        dates: { start: "", end: "" },
        pax: { adults: null, kids: null },
        budget: null,
        hotel: { amenities: [] },
        car: null,
      };

      // Fill origin/destination if detected
      if (flight.origin) {
        const found = detectCityOrAirport(flight.origin) || flight.origin;
        baseSlots.origin_airport_code = found;
      }
      if (flight.destination) {
        const found =
          detectCityOrAirport(flight.destination) || flight.destination;
        baseSlots.destination_city_code = found;
      }

      // try to extract dates/pax/budget from the original text
      const dates = extractDates(text);
      if (dates)
        baseSlots.dates = { start: dates.start || "", end: dates.end || "" };
      const pax = extractPax(text);
      if (pax.adults) baseSlots.pax.adults = pax.adults;
      if (pax.kids) baseSlots.pax.kids = pax.kids;
      const budget = extractBudget(text);
      if (budget) baseSlots.budget = budget;

      // decide missing order
      const missingOrder = [];
      if (!baseSlots.origin_airport_code)
        missingOrder.push("origin_airport_code");
      if (
        !baseSlots.destination_airport_code &&
        !baseSlots.destination_city_code
      )
        missingOrder.push("destination_airport_code");
      if (!baseSlots.dates || !baseSlots.dates.start || !baseSlots.dates.end)
        missingOrder.push("dates");
      if (!baseSlots.pax || !baseSlots.pax.adults) missingOrder.push("pax");
      if (!baseSlots.budget) missingOrder.push("budget");

      // update state and ask for the first missing with prompt
      this.setState(
        { currentSlots: baseSlots, missing: missingOrder, isTyping: false },
        () => {
          if (missingOrder.length > 0) {
            const first = missingOrder[0];
            const prompts = MISSING_PROMPTS[first] || [];
            const botPrompt = prompts.length
              ? prompts[0]
              : `Please provide ${first}.`;
            this.addMessage({ role: "bot", text: botPrompt });
          } else {
            // If nothing missing locally, call server to get package
            this.addMessage({ role: "bot", isTyping: true });
            this.setState({ isTyping: true }, async () => {
              try {
                const resp = await this.sendToServer(text);
                await this._processServerResponse(resp);
              } catch (err) {
                this.removeTypingIndicators();
                this.addMessage({
                  role: "bot",
                  text: "Sorry — couldn't reach the server. Check API URL in lib/api.js.",
                });
                this.setState({ isTyping: false });
              }
            });
          }
        }
      );

      this.setState({ message: "" });
      return true;
    }

    return false;
  };

  // Public send entry (attached to send button)
  handleSend = async () => {
    const { message, isTyping } = this.state;
    if (!message || !message.trim() || isTyping) return;

    // Try local handling first
    const handledLocally = this.handleLocalIntents(message);
    if (handledLocally) return;

    // else server flow
    Keyboard.dismiss();
    this.addMessage({ role: "user", text: message });
    this.setState({ message: "", isTyping: true });
    this.addMessage({ role: "bot", isTyping: true });

    try {
      const resp = await this.sendToServer(message);
      await this._processServerResponse(resp);
    } catch (err) {
      this.removeTypingIndicators();
      this.addMessage({
        role: "bot",
        text: "Sorry — couldn't reach the server. Check API URL in lib/api.js.",
      });
      this.setState({ isTyping: false });
    }
  };

  // Process server response (same logic as earlier: show reply if present; else show missing prompt)
  _processServerResponse = async (resp) => {
    this.removeTypingIndicators();

    const slotsFromServer =
      resp && typeof resp.slots === "object"
        ? resp.slots
        : this.state.currentSlots;
    const missingFromServer = Array.isArray(resp?.missing) ? resp.missing : [];

    this.setState({
      currentSlots: slotsFromServer,
      missing: missingFromServer,
      phase: resp?.nextPhase ?? this.state.phase,
      sessionId: resp?.sessionId ?? this.state.sessionId,
    });

    if (resp?.reply) {
      // show server-provided reply (bot)
      this.addMessage({
        role: "bot",
        text: resp.reply,
        links: resp.links || [],
      });

      // if package returned, show as separate link message for provider previews
      if (resp.package) {
        this.addMessage({
          role: "bot",
          text: resp.reply || "Package ready — open provider previews below.",
          links: (resp.links || []).map((l) => ({
            label: l.label,
            provider: l.provider,
            type: l.type,
            payload: l.payload || l,
          })),
        });
      }

      this.setState({ isTyping: false, missing: [] });
      return;
    }

    // server didn't return textual reply: frontend must ask for missing slot(s)
    if (missingFromServer.length > 0) {
      const firstMissing = missingFromServer[0];
      const prompts = MISSING_PROMPTS[firstMissing] || [];
      const botPrompt = prompts.length
        ? prompts[0]
        : `Please provide ${firstMissing}.`;

      this.addMessage({ role: "bot", text: botPrompt });
      this.setState({ isTyping: false, missing: missingFromServer });
      return;
    }

    // fallback
    this.setState({ isTyping: false });
  };

  // When user taps a suggestion chip
  handleSuggestionTap = (text) => {
    this.setState({ message: text }, () =>
      setTimeout(() => this.handleSend(), 80)
    );
  };

  handleQuickChip = (chipText) => {
    this.setState({ message: chipText }, () =>
      setTimeout(() => this.handleSend(), 120)
    );
  };

  renderMessage = ({ item }) => {
    if (item.isTyping) return <MessageBubble role="bot" isTyping />;
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

  renderSuggestionArea = () => {
    const { missing } = this.state;
    if (!Array.isArray(missing) || missing.length === 0) return null;
    const firstMissing = missing[0];
    const options = PREFILL_OPTIONS[firstMissing] || [];
    if (!options || options.length === 0) return null;

    return (
      <View style={styles.suggestionWrap}>
        <Text style={styles.suggestionLabel}>Suggested replies</Text>
        <View style={styles.suggestionRow}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionChip}
              onPress={() => this.handleSuggestionTap(opt)}
              activeOpacity={0.85}
            >
              <Text style={styles.suggestionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
              keyExtractor={(item) => item.id || this.generateId()}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              onContentSizeChange={() => this.scrollToEndSmooth()}
            />
          )}

          {/* Suggestion chips for first missing slot */}
          {this.renderSuggestionArea()}

          {/* Footer */}
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

/* ===== styles ===== */
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

  /* Suggestion area (prefilled options for missing slot) */
  suggestionWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  suggestionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: { color: COLORS.text, fontSize: 14 },

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
