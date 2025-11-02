// lib/api.js
let CHAT_ENDPOINT = "http://148.100.79.191:8000/chat";
const AUTH_BASE = "http://148.100.78.58:8000/api/v1";

export function setApiBaseUrl(url) {
  CHAT_ENDPOINT = url ? `${url.replace(/\/$/, "")}/chat` : CHAT_ENDPOINT;
}

/**
 * sendMessage now accepts:
 *  { message: string, phase?: string, sessionId?: string, slots?: object }
 */
export async function sendMessage({
  message,
  phase = "idle",
  sessionId = null,
  currentSlots = null,
} = {}) {
  if (typeof message !== "string") {
    throw new Error("sendMessage requires { message: string }");
  }

  const body = {
    message,
    phase,
    session_id: sessionId,
    current_slots: currentSlots,
  };

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn(
      `[chat] Unexpected response: ${res.status} ${res.statusText}`
    );
  }

  return parseJsonResponse(res);
}

export async function login({ username, password } = {}) {
  if (!username || !password) {
    throw new Error("login requires { username, password }");
  }

  const endpoint = `${AUTH_BASE}/auth/login`;
  const body = toFormUrlEncoded({ username, password });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJsonResponse(res);
}

export async function register({ username, email, password } = {}) {
  if (!username || !email || !password) {
    throw new Error("register requires { username, email, password }");
  }

  const endpoint = `${AUTH_BASE}/auth/register`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  return parseJsonResponse(res);
}

export async function getCurrentUser(accessToken) {
  const headers = buildAuthHeaders(accessToken);
  const endpoint = `${AUTH_BASE}/users/me`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers,
  });

  return parseJsonResponse(res);
}

export async function updateCurrentUser(accessToken, payload = {}) {
  const headers = buildAuthHeaders(accessToken, {
    "Content-Type": "application/json",
  });
  const endpoint = `${AUTH_BASE}/users/me`;
  const res = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(res);
}

export async function changePassword(accessToken, { currentPassword, newPassword } = {}) {
  if (!currentPassword || !newPassword) {
    throw new Error("Both currentPassword and newPassword are required");
  }

  const headers = buildAuthHeaders(accessToken, {
    "Content-Type": "application/json",
  });
  const endpoint = `${AUTH_BASE}/auth/change-password`;
  const body = {
    current_password: currentPassword,
    new_password: newPassword,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return parseJsonResponse(res);
}

export async function requestPasswordReset(email) {
  if (!email) {
    throw new Error("Email is required");
  }

  const endpoint = `${AUTH_BASE}/auth/password-reset-request`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseJsonResponse(res);
}

async function parseJsonResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status} ${res.statusText} ${text}`);
  }

  try {
    return await res.json();
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

function toFormUrlEncoded(params) {
  return Object.entries(params)
    .map(([key, value]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value ?? "");
      return `${encodedKey}=${encodedValue}`;
    })
    .join("&");
}

function buildAuthHeaders(accessToken, extra = {}) {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  };
}
