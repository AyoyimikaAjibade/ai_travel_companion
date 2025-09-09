// src/hooks/useTrips.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";

/**
 * Hook for getting user trips
 * @returns {Object} Query object from react-query
 */
export const useTrips = () => {
  return useQuery({
    queryKey: ["trips"],
    queryFn: () => apiClient.getTrips(),
  });
};

/**
 * Hook for saving a trip
 * @returns {Object} Mutation object from react-query
 */
export const useSaveTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trip) => apiClient.saveTrip(trip),
    onSuccess: () => {
      // Invalidate and refetch trips list
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
};
