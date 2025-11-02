// src/hooks/useCurrencyConverter.js
import { useEffect, useState, useCallback } from "react";
import { useSessionStore } from "../stores/sessionStore";

const API_BASE = "https://open.er-api.com/v6/latest";

export function useCurrencyConverter() {
  const targetCurrency = useSessionStore((state) => state.preferences?.currency) ?? "USD";
  const [rates, setRates] = useState({ base: "USD", rates: { USD: 1 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/USD`);
      if (!res.ok) {
        throw new Error(`Unable to fetch rates: ${res.status}`);
      }
      const json = await res.json();
      if (json?.result === "success") {
        setRates({ base: json.base_code ?? "USD", rates: json.rates ?? {} });
      } else {
        throw new Error(json?.error || "Unknown rate error");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = useCallback(
    (amount, from = "USD", to = targetCurrency) => {
      const numeric = Number(amount) || 0;
      if (!rates?.rates) return numeric;
      if (from === to) return numeric;

      const baseRate = rates.rates[from] ?? (from === rates.base ? 1 : null);
      const targetRate = rates.rates[to] ?? (to === rates.base ? 1 : null);
      if (baseRate == null || targetRate == null) return numeric;

      const amountInBase = from === rates.base ? numeric : numeric / baseRate;
      return targetRate ? amountInBase * targetRate : amountInBase;
    },
    [rates, targetCurrency]
  );

  return {
    convertCurrency: convert,
    targetCurrency,
    rates: rates.rates,
    loading,
    error,
    refetch: fetchRates,
  };
}

