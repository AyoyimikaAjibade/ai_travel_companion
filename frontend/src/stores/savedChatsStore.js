// src/stores/savedChatsStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const generateId = () =>
  `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const defaultTitle = (isoDate) => {
  const date = isoDate ? new Date(isoDate) : new Date();
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Trip ${datePart} • ${timePart}`;
};

const GREETING_REGEX =
  /^(hi|hello|hey|hiya|howdy|good\s+(morning|evening|afternoon)|sup|yo)\b/i;
const STOP_WORDS = [
  "flight",
  "flights",
  "trip",
  "travel",
  "journey",
  "package",
  "deal",
  "please",
  "find",
  "book",
  "plan",
  "round",
  "ticket",
  "tickets",
  "and",
  "the",
];

const planeEmoji = "✈️";
const hotelEmoji = "🏨";
const beachEmoji = "🏖️";
const globeEmoji = "🌍";

const cleanWhitespace = (value = "") =>
  value.replace(/\s+/g, " ").replace(/[^\S ]+/g, "").trim();

const toTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const sanitizeLocation = (value = "") => {
  const cleaned = cleanWhitespace(value.replace(/[,\.]/g, " "));
  if (/^[A-Z]{3}$/.test(cleaned)) return cleaned.toUpperCase();
  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 0 &&
        !STOP_WORDS.includes(token.toLowerCase()) &&
        !/^(?:for|from|to|with|on|at)$/i.test(token)
    );
  if (!tokens.length) return cleaned || "";
  return toTitleCase(tokens.join(" "));
};

const detectRouteFromText = (text = "") => {
  if (!text.trim()) return null;
  const normalized = cleanWhitespace(text);

  const iataMatch = normalized.match(
    /\b([A-Z]{3})\b[^A-Za-z0-9]*(?:to|->|→|—|-)\s*\b([A-Z]{3})\b/
  );
  if (iataMatch) {
    return {
      origin: sanitizeLocation(iataMatch[1]),
      destination: sanitizeLocation(iataMatch[2]),
    };
  }

  const fromMatch = normalized.match(
    /\bfrom\s+([^,]+?)\s+(?:to|->|→|—|-)\s+([^,]+?)(?:\s|$)/i
  );
  if (fromMatch) {
    return {
      origin: sanitizeLocation(fromMatch[1]),
      destination: sanitizeLocation(fromMatch[2]),
    };
  }

  const genericMatch = normalized.match(
    /\b([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)\s+(?:to|->|→|—|-)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)/i
  );
  if (genericMatch) {
    return {
      origin: sanitizeLocation(genericMatch[1]),
      destination: sanitizeLocation(genericMatch[2]),
    };
  }

  return null;
};

const detectTopicEmoji = (text = "") => {
  const lower = text.toLowerCase();
  if (/(flight|fly|airport|airfare|airline)/.test(lower)) return planeEmoji;
  if (/(hotel|stay|resort|room|suite|lodging)/.test(lower)) return hotelEmoji;
  if (/(beach|island|coast|resort|sun|sand)/.test(lower)) return beachEmoji;
  return globeEmoji;
};

const findRelevantUserMessage = (messages = []) => {
  return messages.find((msg) => {
    if (msg?.role !== "user" || typeof msg?.text !== "string") return false;
    const text = cleanWhitespace(msg.text);
    if (!text) return false;
    if (GREETING_REGEX.test(text)) return false;
    return text.length > 2;
  });
};

const generateSmartTitle = (messages, fallbackIso, existingTitle, userRenamed) => {
  if (userRenamed && existingTitle) return existingTitle;
  if (!Array.isArray(messages) || messages.length === 0) {
    return existingTitle || defaultTitle(fallbackIso);
  }

  const candidate =
    messages.find((msg) => {
      if (msg?.role !== "user" || typeof msg?.text !== "string") return false;
      return Boolean(detectRouteFromText(msg.text));
    }) || findRelevantUserMessage(messages);

  if (!candidate || typeof candidate.text !== "string") {
    return existingTitle || defaultTitle(fallbackIso);
  }

  const text = cleanWhitespace(candidate.text);
  if (!text) {
    return existingTitle || defaultTitle(fallbackIso);
  }

  const route = detectRouteFromText(text);
  if (route?.origin && route?.destination) {
    return `${route.origin} ${planeEmoji} ${route.destination}`;
  }

  const emoji = detectTopicEmoji(text);
  const cleaned = text.length > 48 ? `${text.slice(0, 45).trim()}…` : text;
  return `${emoji} ${cleaned}`;
};

const derivePreview = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  const reversed = [...messages].reverse();
  const lastWithText = reversed.find(
    (msg) => typeof msg?.text === "string" && msg.text.trim().length
  );
  if (!lastWithText) return "";
  const cleaned = lastWithText.text.trim().replace(/\s+/g, " ");
  return cleaned.length > 140 ? `${cleaned.slice(0, 137).trim()}…` : cleaned;
};

const isMeaningfulConversation = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  const userMessages = messages.filter(
    (msg) => msg?.role === "user" && typeof msg?.text === "string"
  );
  if (!userMessages.length) return false;

  return userMessages.some((msg) => {
    const text = cleanWhitespace(msg.text || "");
    if (!text) return false;
    if (GREETING_REGEX.test(text) && text.length <= 20) return false;
    return text.length > 2;
  });
};

const sanitizeMessages = (messages = []) =>
  Array.isArray(messages) ? messages : [];

export const useSavedChatsStore = create(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,

      startNewChat: (title) => {
        const now = new Date().toISOString();
        const id = generateId();
        const trimmedTitle = typeof title === "string" ? title.trim() : "";
        const chat = {
          id,
          title: trimmedTitle || defaultTitle(now),
          createdAt: now,
          updatedAt: now,
          messages: [],
          preview: "",
          userRenamed: Boolean(trimmedTitle),
          sessionId: null,
          phase: "idle",
          currentSlots: null,
          missing: [],
          ephemeral: !trimmedTitle,
          status: "draft",
          booking: null,
        };
        set((state) => ({
          chats: [chat, ...state.chats.filter((c) => !c.ephemeral)],
          currentChatId: id,
        }));
        return id;
      },

      setActiveChat: (id) => {
        const chat = get().chats.find((c) => c.id === id);
        if (!chat) return null;
        set({ currentChatId: id });
        return chat;
      },

      getChatById: (id) => get().chats.find((chat) => chat.id === id),

      updateChatContent: (id, messages = [], meta = {}) => {
        const now = new Date().toISOString();
        const sanitizedMessages = sanitizeMessages(messages);
        const meaningful = isMeaningfulConversation(sanitizedMessages);

        set((state) => {
          const chats = [...state.chats];
          const index = chats.findIndex((chat) => chat.id === id);

          if (index >= 0) {
            const existing = chats[index];
            const userRenamed = Boolean(existing.userRenamed);
            const nextTitle = meaningful
              ? generateSmartTitle(
                  sanitizedMessages,
                  now,
                  existing.title,
                  userRenamed
                )
              : userRenamed
              ? existing.title
              : defaultTitle(existing.createdAt || now);

            const updated = {
              ...existing,
              messages: sanitizedMessages,
              updatedAt: now,
              title: nextTitle,
              preview: meaningful ? derivePreview(sanitizedMessages) : "",
              sessionId:
                meta.sessionId !== undefined
                  ? meta.sessionId
                  : existing.sessionId ?? null,
              phase: meta.phase ?? existing.phase ?? "idle",
              currentSlots:
                meta.currentSlots !== undefined
                  ? meta.currentSlots
                  : existing.currentSlots ?? null,
              missing: Array.isArray(meta.missing)
                ? meta.missing
                : existing.missing ?? [],
              ephemeral: !meaningful && !userRenamed,
              status: meta.status ?? existing.status ?? "draft",
              booking:
                meta.booking !== undefined
                  ? meta.booking
                  : existing.booking ?? null,
            };

            if (updated.status === "booked") {
              updated.ephemeral = false;
            }

            chats[index] = updated;
            return { chats, currentChatId: id };
          }

          const userRenamed = Boolean(meta?.title && meta.title.trim());
          const nextTitle = meaningful
            ? generateSmartTitle(
                sanitizedMessages,
                now,
                meta?.title,
                userRenamed
              )
            : userRenamed
            ? meta.title.trim()
            : defaultTitle(now);

          const newChat = {
            id,
            title: nextTitle,
            createdAt: now,
            updatedAt: now,
            messages: sanitizedMessages,
            preview: meaningful ? derivePreview(sanitizedMessages) : "",
            userRenamed,
            sessionId: meta.sessionId ?? null,
            phase: meta.phase ?? "idle",
            currentSlots: meta.currentSlots ?? null,
            missing: Array.isArray(meta.missing) ? meta.missing : [],
            ephemeral: !meaningful && !userRenamed,
            status: meta.status ?? "draft",
            booking: meta.booking ?? null,
          };

          if (newChat.status === "booked") {
            newChat.ephemeral = false;
          }

          return {
            chats: [newChat, ...chats.filter((chat) => chat.id !== id)],
            currentChatId: id,
          };
        });
      },

      updateChatMetadata: (id, meta = {}) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? {
                  ...chat,
                  ...meta,
                  missing: Array.isArray(meta.missing)
                    ? meta.missing
                    : chat.missing,
                  ephemeral:
                    typeof meta.ephemeral === "boolean"
                      ? meta.ephemeral
                      : chat.ephemeral,
                  status: meta.status ?? chat.status ?? "draft",
                  booking:
                    meta.booking !== undefined
                      ? meta.booking
                      : chat.booking ?? null,
                }
              : chat
          ),
        })),

      markChatBooked: (id, booking = null) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? {
                  ...chat,
                  status: "booked",
                  booking,
                  ephemeral: false,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          ),
        })),

      renameChat: (id, title) => {
        const trimmed = typeof title === "string" ? title.trim() : "";
        if (!trimmed) return;
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? {
                  ...chat,
                  title: trimmed,
                  userRenamed: true,
                  ephemeral: false,
                }
              : chat
          ),
        }));
      },

      deleteChat: (id) =>
        set((state) => {
          const filtered = state.chats.filter((chat) => chat.id !== id);
          const wasActive = state.currentChatId === id;
          const nextActive = wasActive ? filtered[0]?.id ?? null : state.currentChatId;
          return {
            chats: filtered,
            currentChatId: nextActive,
          };
        }),

      clearAll: () => set({ chats: [], currentChatId: null }),
    }),
    {
      name: "saved-chats",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
      }),
    }
  )
);
