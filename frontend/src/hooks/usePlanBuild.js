// src/hooks/usePlanBuild.js
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/api";

/**
 * Hook for building travel plans
 * @returns {Object} Mutation object from react-query
 */
export const usePlanBuild = () => {
  return useMutation({
    mutationFn: ({ slots, prefs }) => apiClient.planBuild(slots, prefs),
  });
};
