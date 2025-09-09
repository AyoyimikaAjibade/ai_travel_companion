// src/lib/api.js
import axios from "axios";

// Mock data
import parseMock from "../mocks/parse.json";
import packagesMock from "../mocks/packages.json";
import tripsMock from "../mocks/trips.json";

// Check if we should use mocks
const USE_MOCKS = !process.env.EXPO_PUBLIC_API_BASE;

// Create axios instance
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// API methods
export const apiClient = {
  /**
   * Parse natural language message
   * @param {string} message
   * @returns {Promise}
   */
  nluParse: async (message) => {
    if (USE_MOCKS) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { data: parseMock };
    }

    return api.post("/nlu/parse", { message });
  },

  /**
   * Build travel plan based on slots and preferences
   * @param {Object} slots
   * @param {Object} prefs
   * @returns {Promise}
   */
  planBuild: async (slots, prefs) => {
    if (USE_MOCKS) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { data: packagesMock };
    }

    return api.post("/plan/build", { slots, prefs });
  },

  /**
   * Get user trips
   * @returns {Promise}
   */
  getTrips: async () => {
    if (USE_MOCKS) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { data: tripsMock };
    }

    return api.get("/trips");
  },

  /**
   * Save a trip
   * @param {Object} trip
   * @returns {Promise}
   */
  saveTrip: async (trip) => {
    if (USE_MOCKS) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { data: { tripId: `mock_${Date.now()}` } };
    }

    return api.post("/trips/save", trip);
  },
};

export default api;
