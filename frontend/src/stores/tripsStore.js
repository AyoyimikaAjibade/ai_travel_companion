// src/stores/tripsStore.js
import { create } from "zustand";

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} destination
 * @property {string} dates
 * @property {number} total
 * @property {'confirmed' | 'pending' | 'cancelled'} status
 * @property {Object} packageData
 */

/**
 * @typedef {Object} TripsState
 * @property {Trip[]} trips
 * @property {Function} addTrip
 * @property {Function} removeTrip
 * @property {Object} currentPackage
 * @property {Function} setCurrentPackage
 */

/** @type {TripsState} */
export const useTripsStore = create((set) => ({
  trips: [],
  addTrip: (trip) =>
    set((state) => ({
      trips: [...state.trips, { ...trip, id: Date.now().toString() }],
    })),
  removeTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((trip) => trip.id !== id),
    })),
  currentPackage: null,
  setCurrentPackage: (packageData) => set({ currentPackage: packageData }),
}));
