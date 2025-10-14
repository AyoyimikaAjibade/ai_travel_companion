// lib/api.js
let API_BASE = "http://localhost:3000"; // change to your dev IP as needed

export function setApiBaseUrl(url) {
  API_BASE = url;
}

/**
 * sendMessage now accepts:
 *  { message: string, phase?: string, sessionId?: string, slots?: object }
 */
export async function sendMessage({
  message,
  phase = "idle",
  sessionId = null,
  slots = {},
} = {}) {
  if (typeof message !== "string") {
    throw new Error("sendMessage requires { message: string }");
  }

  const endpoint = `${API_BASE.replace(/\/$/, "")}/message`;
  const body = { message, phase, sessionId, slots };

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
