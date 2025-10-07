// lib/api.js
// Centralized API client for TWOS mock server
// Usage:
//   import { sendMessage, setApiBaseUrl } from "../lib/api";
//   setApiBaseUrl("http://192.168.1.100:3000"); // optional at app start
//   const resp = await sendMessage({ message: "hi", phase: "idle" });

let API_BASE = "http://localhost:3000"; // default for simulator/dev machine

/**
 * Replace base URL at runtime. Useful for switching to LAN IP when testing on device.
 * Example: setApiBaseUrl("http://192.168.1.100:3000");
 */
export function setApiBaseUrl(url) {
  API_BASE = url;
}

/**
 * Post chat message to /message endpoint.
 * Accepts an object: { message: string, phase?: string, sessionId?: string }
 * Returns parsed JSON from server (or throws).
 */
export async function sendMessage({
  message,
  phase = "idle",
  sessionId = null,
} = {}) {
  if (!message && typeof message !== "string") {
    throw new Error("sendMessage requires { message: string }");
  }

  const endpoint = `${API_BASE.replace(/\/$/, "")}/message`;

  const body = {
    message,
    phase,
    sessionId,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json().catch(() => {
    throw new Error("Invalid JSON response from server");
  });

  return json;
}
