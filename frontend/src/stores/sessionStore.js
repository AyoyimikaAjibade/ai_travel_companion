// src/stores/sessionStore.js
import { create } from "zustand";

/**
 * @typedef {Object} UserPreferences
 * @property {string} currency
 * @property {number} minRating
 * @property {boolean} breakfastIncluded
 * @property {boolean} carIncluded
 */

/**
 * @typedef {Object} SessionState
 * @property {boolean} hasCompletedOnboarding
 * @property {Function} setOnboardingCompleted
 * @property {UserPreferences} preferences
 * @property {Function} updatePreferences
 * @property {Object|null} user
 * @property {string|null} accessToken
 * @property {Function} setSession
 * @property {Function} updateUser
 * @property {Function} clearSession
 */

/** @type {SessionState} */
export const useSessionStore = create((set) => ({
  hasCompletedOnboarding: false,
  setOnboardingCompleted: (completed) =>
    set({ hasCompletedOnboarding: completed }),
  preferences: {
    currency: "USD",
    minRating: 4,
    breakfastIncluded: true,
    carIncluded: false,
  },
  updatePreferences: (newPreferences) =>
    set((state) => ({
      preferences: { ...state.preferences, ...newPreferences },
    })),
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) =>
    set({ user: user ?? null, accessToken: accessToken ?? null }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : state.user,
    })),
  clearSession: () =>
    set({
      user: null,
      accessToken: null,
    }),
}));
