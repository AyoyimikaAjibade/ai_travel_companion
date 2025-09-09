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
}));
