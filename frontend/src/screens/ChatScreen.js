// src/screens/ChatScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  InteractionManager,
  Text,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Plus, Keyboard as KeyboardIcon } from "lucide-react-native";
import MessageBubble from "../components/MessageBubble";
import TagChip from "../components/TagChip";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { sendMessage } from "../lib/api";
import { useSavedChatsStore } from "../stores/savedChatsStore";

import PREFILL_OPTIONS from "../data/prefill_options.json";
import MISSING_PROMPTS from "../data/missing_prompts.json";
import GREETINGS from "../data/greetings.json";
import { useSessionStore } from "../stores/sessionStore";

const getSessionPreferences = () => {
  try {
    return useSessionStore.getState()?.preferences ?? {};
  } catch (error) {
    if (__DEV__) console.warn("Unable to read session preferences", error);
    return {};
  }
};

const getDefaultSlots = () => {
  const prefs = getSessionPreferences();

  const base = {
    slot_id: null,
    origin_airport_code: null,
    destination_airport_name: null,
    destination_airport_code: null,
    destination_city_code: null,
    destination_city_name: null,
    dates: {
      start: null,
      end: null,
    },
    pax: {
      adults: 0,
      kids: 0,
    },
    budget: null,
    hotel: {
      request: null,
      amenities: [],
      rating: null,
    },
    car: false,
    attractions: [],
  };

  if (prefs.breakfastIncluded) {
    base.hotel.amenities = ["breakfast"];
  }

  if (prefs.minRating != null) {
    const numericRating = Number(prefs.minRating);
    base.hotel.rating = Number.isNaN(numericRating)
      ? prefs.minRating
      : numericRating;
  }

  if (typeof prefs.carIncluded === "boolean") {
    base.car = prefs.carIncluded;
  }

  return base;
};

const mergeSlots = (overrides = {}) => {
  const base = getDefaultSlots();
  return {
    ...base,
    ...overrides,
    dates: { ...base.dates, ...(overrides?.dates || {}) },
    pax: { ...base.pax, ...(overrides?.pax || {}) },
    hotel: {
      ...base.hotel,
      ...(overrides?.hotel || {}),
      amenities: Array.isArray(overrides?.hotel?.amenities)
        ? overrides.hotel.amenities
        : base.hotel.amenities,
    },
    attractions: Array.isArray(overrides?.attractions)
      ? overrides.attractions
      : base.attractions,
  };
};

const getSessionAuth = () => {
  try {
    const state = useSessionStore.getState?.() || {};
    const userId =
      state.userId ??
      state.user?.id ??
      state.user?.user_id ??
      state.user?.userId ??
      null;
    return {
      userId,
      isLoggedIn: Boolean(state.accessToken),
    };
  } catch (error) {
    if (__DEV__) console.warn("Unable to read session auth data", error);
    return { userId: null, isLoggedIn: false };
  }
};

/* ====== Config ====== */
const QUICK_CHIPS = [
  "Add car",
  "Breakfast + Pool",
  "Under $1500",
  "Non-stop flights",
  "4+ star hotels",
];

const TYPING_MIN_MS = 1500;

const AnimatedMessageBubble = ({ children, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 10,
        bounciness: 6,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

/* Subtle ambient animation so the chat never feels static */
const FloatingBackdrop = () => {
  const orbs = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    orbs.forEach((value, idx) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 2400 + idx * 300,
            delay: idx * 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 2400 + idx * 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: true }
      ).start();
    });
  }, [orbs]);

  const positions = [
    { top: 24, left: 24 },
    { top: 180, right: 20 },
    { top: 340, left: 54 },
  ];

  return (
    <View style={styles.ambientWrap} pointerEvents="none">
      {orbs.map((value, idx) => {
        const translateY = value.interpolate({
          inputRange: [0, 1],
          outputRange: [-8 - idx * 2, 10 + idx * 2],
        });
        const opacity = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.18, 0.5],
        });
        return (
          <Animated.View
            key={idx}
            style={[
              styles.ambientOrb,
              positions[idx],
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

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
      currentSlots: getDefaultSlots(),
      missing: [],
      chatStatus: "draft",
      booking: null,
      isKeyboardVisible: false,
    };
    this.flatListRef = React.createRef();
    this.typingStartedAt = null;
    this._localFillAttempts = 0;
    this.currentChatId = null;
    this.isApplyingChat = false;
    this.unsubscribeFocus = null;
    this.unsubscribeStore = null;
    this.keyboardShowListener = null;
    this.keyboardHideListener = null;
    this.handleStoreChange = this.handleStoreChange.bind(this);
    this.sendScale = new Animated.Value(1);
    this.newChatScale = new Animated.Value(1);
    this.suggestionPulse = new Animated.Value(0);
  }

  componentDidMount() {
    this.initializeChatSession();
    if (this.props.navigation?.addListener) {
      this.unsubscribeFocus = this.props.navigation.addListener(
        "focus",
        this.handleNavigationFocus
      );
    }
    this.unsubscribeStore = useSavedChatsStore.subscribe(
      this.handleStoreChange
    );
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    this.keyboardShowListener = Keyboard.addListener(
      showEvent,
      this.handleKeyboardShow
    );
    this.keyboardHideListener = Keyboard.addListener(
      hideEvent,
      this.handleKeyboardHide
    );

    Animated.loop(
      Animated.sequence([
        Animated.timing(this.suggestionPulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(this.suggestionPulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true }
    ).start();
  }

  componentDidUpdate(prevProps, prevState) {
    const prevChatParam = prevProps?.route?.params?.chatId;
    const nextChatParam = this.props?.route?.params?.chatId;

    if (
      nextChatParam &&
      nextChatParam !== prevChatParam &&
      nextChatParam !== this.currentChatId
    ) {
      const loaded = this.loadChatSession(nextChatParam);
      if (!loaded) {
        this.startFreshChat();
      }
    }

    const messagesChanged = prevState.messages !== this.state.messages;
    const metaChanged =
      prevState.sessionId !== this.state.sessionId ||
      prevState.phase !== this.state.phase ||
      prevState.currentSlots !== this.state.currentSlots ||
      prevState.missing !== this.state.missing;

    if (!this.isApplyingChat && (messagesChanged || metaChanged)) {
      this.persistChatState();
    }
  }

  componentWillUnmount() {
    if (typeof this.unsubscribeFocus === "function") {
      this.unsubscribeFocus();
    }
    if (typeof this.unsubscribeStore === "function") {
      this.unsubscribeStore();
    }
    this.keyboardShowListener?.remove();
    this.keyboardHideListener?.remove();
  }

  handleKeyboardShow = () => {
    if (!this.state.isKeyboardVisible) {
      this.setState({ isKeyboardVisible: true });
    }
  };

  handleKeyboardHide = () => {
    if (this.state.isKeyboardVisible) {
      this.setState({ isKeyboardVisible: false });
    }
  };

  animateScale = (value, toValue = 1) => {
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  handleSendPressIn = () => this.animateScale(this.sendScale, 0.94);
  handleSendPressOut = () => this.animateScale(this.sendScale, 1);
  handleNewChatPressIn = () => this.animateScale(this.newChatScale, 0.94);
  handleNewChatPressOut = () => this.animateScale(this.newChatScale, 1);

  dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  handleStoreChange(state) {
    if (!this.currentChatId) return;
    // Don't overwrite local typing indicator while it's showing
    if (this.state.isTyping) return;
    const chat =
      state.getChatById?.(this.currentChatId) ??
      state.chats?.find?.((c) => c.id === this.currentChatId);
    if (!chat) return;
    const normalizedMessages = Array.isArray(chat.messages)
      ? chat.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }))
      : [];
    const prevMessages = this.state.messages || [];
    const hasMessagesChanged =
      normalizedMessages.length !== prevMessages.length ||
      (normalizedMessages.length > 0 &&
        normalizedMessages[normalizedMessages.length - 1]?.id !==
          prevMessages[prevMessages.length - 1]?.id);
    if (hasMessagesChanged) {
      this.isApplyingChat = true;
    }

    this.setState(
      {
        chatStatus: chat.status ?? "draft",
        booking: chat.booking ?? null,
        messages: hasMessagesChanged ? normalizedMessages : prevMessages,
      },
      () => {
        if (hasMessagesChanged) {
          this.isApplyingChat = false;
        }
      }
    );
  }

  initializeChatSession = () => {
    const persist = useSavedChatsStore?.persist;
    const ensure = () => this.setupChatFromStore();

    if (persist?.hasHydrated?.()) {
      ensure();
    } else if (persist?.onFinish) {
      persist.onFinish(ensure);
    } else {
      ensure();
    }
  };

  setupChatFromStore = () => {
    const routeChatId = this.props?.route?.params?.chatId;
    if (routeChatId && this.loadChatSession(routeChatId)) {
      return;
    }
    this.startFreshChat();
  };

  handleNavigationFocus = () => {
    const chatId = this.props?.route?.params?.chatId;
    if (chatId && chatId !== this.currentChatId) {
      const loaded = this.loadChatSession(chatId);
      if (!loaded) {
        this.startFreshChat();
      }
    }
  };

  loadChatSession = (chatId) => {
    if (!chatId) return false;
    const storeState = useSavedChatsStore.getState();
    const chat =
      typeof storeState.getChatById === "function"
        ? storeState.getChatById(chatId)
        : null;
    if (!chat) return false;
    if (typeof storeState.setActiveChat === "function") {
      storeState.setActiveChat(chatId);
    }
    this.applyChat(chat);
    return true;
  };

  startFreshChat = () => {
    const storeState = useSavedChatsStore.getState();
    const newId = storeState.startNewChat();
    this.currentChatId = newId;
    const refreshed = useSavedChatsStore.getState();
    const chat =
      typeof refreshed.getChatById === "function"
        ? refreshed.getChatById(newId)
        : null;
    if (chat) {
      if (typeof refreshed.setActiveChat === "function") {
        refreshed.setActiveChat(newId);
      }
      if (this.props?.navigation?.setParams) {
        this.props.navigation.setParams({ chatId: undefined });
      }
      this.applyChat(chat);
    }
  };

  handleNewChat = () => {
    this.startFreshChat();
  };

  applyChat = (chat) => {
    if (!chat) return;
    this.currentChatId = chat.id;
    const messages = Array.isArray(chat.messages)
      ? chat.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }))
      : [];

    const storedSlots =
      chat.currentSlots && typeof chat.currentSlots === "object"
        ? mergeSlots(chat.currentSlots)
        : getDefaultSlots();

    this.isApplyingChat = true;
    this.setState(
      {
        messages,
        message: "",
        isTyping: false,
        phase: chat.phase ?? "idle",
        sessionId: chat.sessionId ?? null,
        currentSlots: storedSlots,
        missing: Array.isArray(chat.missing) ? chat.missing : [],
        chatStatus: chat.status ?? "draft",
        booking: chat.booking ?? null,
      },
      () => {
        this.isApplyingChat = false;
        this.scrollToEndSmooth();
      }
    );
  };

  persistChatState = () => {
    const storeState = useSavedChatsStore.getState();
    const { messages, sessionId, phase, currentSlots, missing } = this.state;
    const { chatStatus, booking } = this.state;

    let chatId = this.currentChatId;
    let chat =
      chatId && typeof storeState.getChatById === "function"
        ? storeState.getChatById(chatId)
        : null;

    if (!chat) {
      const newId = storeState.startNewChat();
      chatId = newId;
      this.currentChatId = newId;
      const refreshed = useSavedChatsStore.getState();
      chat =
        typeof refreshed.getChatById === "function"
          ? refreshed.getChatById(chatId)
          : null;
    } else if (typeof storeState.setActiveChat === "function") {
      storeState.setActiveChat(chatId);
    }

    const sanitizedMessages = (Array.isArray(messages) ? messages : [])
      .filter((msg) => !msg.isTyping)
      .map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : new Date(msg.timestamp ?? Date.now()).toISOString(),
      }));

    const slotSnapshot =
      currentSlots && typeof currentSlots === "object"
        ? mergeSlots(currentSlots)
        : getDefaultSlots();

    useSavedChatsStore.getState().updateChatContent(chatId, sanitizedMessages, {
      sessionId,
      phase,
      currentSlots: slotSnapshot,
      missing,
      status: chatStatus,
      booking,
    });
  };

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
      id: newMessage.id ? String(newMessage.id) : this.generateId(),
      timestamp:
        newMessage.timestamp instanceof Date
          ? newMessage.timestamp
          : newMessage.timestamp
          ? new Date(newMessage.timestamp)
          : new Date(),
    };
    this.setState(
      (prev) => ({ messages: [...prev.messages, messageWithId] }),
      () => this.scrollToEndSmooth()
    );
  };

  removeTypingIndicators = () => {
    this.typingStartedAt = null;
    this.setState((prev) => ({
      messages: prev.messages.filter((m) => !m.isTyping),
    }));
  };

  showTypingIndicator = () => {
    this.typingStartedAt = Date.now();
    const typingMessage = {
      id: this.generateId(),
      role: "bot",
      isTyping: true,
      timestamp: new Date(),
    };
    this.setState(
      (prev) => ({
        isTyping: true,
        messages: [...prev.messages.filter((m) => !m.isTyping), typingMessage],
      }),
      () => this.scrollToEndSmooth()
    );
  };

  waitForTypingMinimum = async () => {
    const elapsed = this.typingStartedAt
      ? Date.now() - this.typingStartedAt
      : 0;
    const remaining = Math.max(0, TYPING_MIN_MS - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  };

  clearTypingIndicator = () => {
    this.removeTypingIndicators();
    this.setState({ isTyping: false });
  };

  sendToServer = async (messageText) => {
    const { phase, sessionId, currentSlots } = this.state;
    const { userId, isLoggedIn } = getSessionAuth();
    const slotsPayload =
      currentSlots && typeof currentSlots === "object"
        ? mergeSlots(currentSlots)
        : getDefaultSlots();
    const payload = {
      message: messageText,
      phase,
      sessionId,
      currentSlots: slotsPayload,
    };
    if (isLoggedIn && userId) {
      payload.userId = userId;
    }
    return sendMessage(payload);
  };

  // Local handler: greetings and small talk
  handleLocalIntents = async (rawText) => {
    const text = (rawText || "").trim();
    if (!text) return false;

    // Greetings
    if (isGreeting(text)) {
      this.addMessage({ role: "user", text });
      this.showTypingIndicator();
      // pick a greeting reply
      const arr = GREETINGS.greetings || GREETINGS;
      const reply = arr[Math.floor(Math.random() * arr.length)];
      await this.waitForTypingMinimum();
      this.clearTypingIndicator();
      this.addMessage({ role: "bot", text: reply });
      this.setState({ message: "" });
      return true;
    }

    if (isHowAreYou(text)) {
      this.addMessage({ role: "user", text });
      this.showTypingIndicator();
      const arr = GREETINGS.how_are_you || ["I'm good — ready to help!"];
      const reply = arr[Math.floor(Math.random() * arr.length)];
      await this.waitForTypingMinimum();
      this.clearTypingIndicator();
      this.addMessage({ role: "bot", text: reply });
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
    const handledLocally = await this.handleLocalIntents(message);
    if (handledLocally) return;

    // else server flow
    Keyboard.dismiss();
    this.addMessage({ role: "user", text: message });
    this.setState({ message: "" }, this.showTypingIndicator);

    try {
      const resp = await this.sendToServer(message);
      await this._processServerResponse(resp);
    } catch (err) {
      await this.waitForTypingMinimum();
      this.clearTypingIndicator();
      this.addMessage({
        role: "bot",
        text: "Sorry — couldn't reach the server. Check API URL in lib/api.js.",
      });
    }
  };

  // Process server response (same logic as earlier: show reply if present; else show missing prompt)
  _processServerResponse = async (resp) => {
    await this.waitForTypingMinimum();
    this.clearTypingIndicator();

    const rawSlots =
      (resp && (resp.current_slots ?? resp.currentSlots ?? resp.slots)) || null;
    const slotsFromServer =
      rawSlots && typeof rawSlots === "object"
        ? mergeSlots(rawSlots)
        : this.state.currentSlots;
    const missingFromServer = Array.isArray(resp?.missing) ? resp.missing : [];
    const sessionIdFromResponse =
      resp?.session_id ?? resp?.sessionId ?? this.state.sessionId;

    this.setState({
      currentSlots: slotsFromServer,
      missing: missingFromServer,
      phase: resp?.nextPhase ?? this.state.phase,
      sessionId: sessionIdFromResponse,
      isTyping: false,
    });

    if (resp?.reply) {
      this.addMessage({
        role: "bot",
        text: resp.reply,
        links: Array.isArray(resp.links) ? resp.links : [],
      });
    } else if (Array.isArray(resp?.links) && resp.links.length > 0) {
      this.addMessage({
        role: "bot",
        text: "Here are some options you can review:",
        links: resp.links.map((l) => ({
          label: l.label,
          provider: l.provider,
          type: l.type || "link",
          payload: l.payload || l,
        })),
      });
    }

    const planData = {
      planId: resp?.plan_id ?? resp?.planId ?? null,
      slotId: resp?.slot_id ?? resp?.slotId ?? slotsFromServer?.slot_id ?? null,
      flight: resp?.flight ?? null,
      hotel: resp?.hotel ?? null,
      car: resp?.car ?? null,
      attractions: Array.isArray(resp?.attractions) ? resp.attractions : [],
      currentSlots: slotsFromServer,
    };

    const hasPlan =
      planData.planId ||
      (planData.flight && Object.keys(planData.flight || {}).length > 0) ||
      (planData.hotel && Object.keys(planData.hotel || {}).length > 0) ||
      (planData.car && Object.keys(planData.car || {}).length > 0) ||
      (planData.attractions && planData.attractions.length > 0);

    if (hasPlan) {
      this.addMessage({
        role: "bot",
        text: resp?.plan_summary || "Booking set ready below.",
        plan: planData,
      });
    }

    if (!resp?.reply && missingFromServer.length > 0) {
      const firstMissing = missingFromServer[0];
      const prompts = MISSING_PROMPTS[firstMissing] || [];
      const botPrompt = prompts.length
        ? prompts[0]
        : `Please provide ${firstMissing}.`;
      this.addMessage({ role: "bot", text: botPrompt });
    }
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
      <AnimatedMessageBubble delay={40}>
        <MessageBubble
          role={item.role}
          text={item.text}
          time={item.timestamp}
          links={item.links}
          plan={item.plan}
          navigation={this.props.navigation}
          chatId={this.currentChatId}
          booking={this.state.booking}
        />
      </AnimatedMessageBubble>
    );
  };

  renderSuggestionArea = () => {
    const { missing } = this.state;
    if (!Array.isArray(missing) || missing.length === 0) return null;
    const firstMissing = missing[0];
    const options = PREFILL_OPTIONS[firstMissing] || [];
    if (!options || options.length === 0) return null;

    const scale = this.suggestionPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.04],
    });
    const opacity = this.suggestionPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.92],
    });

    return (
      <View style={styles.suggestionWrap}>
        <View style={styles.suggestionHeader}>
          <Text style={styles.suggestionLabel}>Suggested replies</Text>
          <TouchableOpacity
            onPress={() => this.setState({ missing: [] })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss suggestions"
            activeOpacity={0.8}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={[styles.suggestionRow, { transform: [{ scale }], opacity }]}
        >
          {options.map((opt, idx) => (
            <Animated.View
              key={idx}
              style={{ transform: [{ scale }] }}
              entering={undefined}
            >
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => this.handleSuggestionTap(opt)}
                activeOpacity={0.85}
              >
                <Text style={styles.suggestionText}>{opt}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
    );
  };

  render() {
    const { messages, message, isTyping, isKeyboardVisible } = this.state;

    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <View style={styles.container}>
            <FloatingBackdrop />
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>Plan a trip</Text>
              <Animated.View style={{ transform: [{ scale: this.newChatScale }] }}>
                <TouchableOpacity
                  style={styles.newChatBtn}
                  onPress={this.handleNewChat}
                  activeOpacity={0.88}
                  onPressIn={this.handleNewChatPressIn}
                  onPressOut={this.handleNewChatPressOut}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.newChatText}>New chat</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

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
                extraData={{
                  booking: this.state.booking,
                  status: this.state.chatStatus,
                }}
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
              {/* <View style={styles.quickChips}>
                {QUICK_CHIPS.map((chip, index) => (
                  <TagChip
                    key={index}
                    text={chip}
                    onPress={() => this.handleQuickChip(chip)}
                  />
                ))}
              </View> */}

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
                {isKeyboardVisible && (
                  <TouchableOpacity
                    onPress={this.dismissKeyboard}
                    style={styles.keyboardDismissButton}
                    accessibilityLabel="Hide keyboard"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <KeyboardIcon size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <Animated.View style={{ transform: [{ scale: this.sendScale }] }}>
                  <TouchableOpacity
                    onPress={this.handleSend}
                    style={[
                      styles.sendButton,
                      isTyping && styles.sendButtonDisabled,
                    ]}
                    disabled={isTyping}
                    onPressIn={this.handleSendPressIn}
                    onPressOut={this.handleSendPressOut}
                    activeOpacity={0.9}
                  >
                    <Send
                      size={24}
                      color={isTyping ? COLORS.textMuted : COLORS.primary}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

/* ===== styles ===== */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoider: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  ambientWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  ambientOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 90,
    backgroundColor: "rgba(99,102,241,0.14)",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(124,58,237,0.28)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.45)",
    gap: 6,
  },
  newChatText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },

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
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  suggestionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 14,
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
  keyboardDismissButton: {
    marginLeft: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: SPACING.xs,
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
