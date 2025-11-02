// src/hooks/useCountryCodes.js
import { useEffect, useState, useCallback } from "react";

const ENDPOINT =
  "https://restcountries.com/v3.1/all?fields=idd,name,cca2,cca3";

const parseCodes = (countries = []) =>
  countries
    .map((country) => {
      const root = country?.idd?.root;
      const suffixes = country?.idd?.suffixes;
      if (!root || !Array.isArray(suffixes) || suffixes.length === 0) {
        return null;
      }
      const code = `${root}${suffixes[0]}`;
      return {
        name: country?.name?.common ?? "Unknown",
        code,
        cca2: country?.cca2,
        cca3: country?.cca3,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

export function useCountryCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) {
        throw new Error(`Failed to load country codes: ${res.status}`);
      }
      const json = await res.json();
      setCodes(parseCodes(json));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  return { codes, loading, error, refetch: fetchCodes };
}

