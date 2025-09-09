// src/stores/chatStore.js
import { create } from "zustand";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'bot'} role
 * @property {string} text
 * @property {Date} timestamp
 * @property {boolean} [isTyping] - Whether this is a typing indicator
 * @property {Object} [data] - Optional data for package previews
 */

/**
 * @typedef {Object} ChatState
 * @property {Message[]} messages
 * @property {Function} addMessage
 * @property {Function} clearMessages
 * @property {Function} removeTypingIndicators
 */

/** @type {ChatState} */
export const useChatStore = create((set, get) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { ...message, id: Date.now().toString() }],
    })),
  clearMessages: () => set({ messages: [] }),
  removeTypingIndicators: () =>
    set((state) => ({
      messages: state.messages.filter((msg) => !msg.isTyping),
    })),
}));
