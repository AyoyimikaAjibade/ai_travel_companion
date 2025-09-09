// src/hooks/useSaveTrip.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";

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
