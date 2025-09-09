// src/hooks/useNluParse.js
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/api";

/**
 * Hook for parsing natural language messages
 * @returns {Object} Mutation object from react-query
 */
export const useNluParse = () => {
  return useMutation({
    mutationFn: (message) => apiClient.nluParse(message),
  });
};
