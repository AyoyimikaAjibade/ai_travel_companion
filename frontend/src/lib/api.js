// lib/api.js
let CHAT_ENDPOINT = "http://148.100.78.58:8000/chat";
const AUTH_BASE = "http://148.100.78.58:8001/api/v1";

export function setApiBaseUrl(url) {
  CHAT_ENDPOINT = url ? `${url.replace(/\/$/, "")}/chat` : CHAT_ENDPOINT;
}

/**
 * sendMessage now accepts:
 *  { message: string, phase?: string, sessionId?: string, slots?: object, userId?: string }
 */
export async function sendMessage({
  message,
  phase = "idle",
  sessionId = null,
  currentSlots = null,
  userId = null,
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

   if (userId) {
     body.user_id = userId;
   }

  console.log("[Chat Endpoint] Sending request:", {
    endpoint: CHAT_ENDPOINT,
    method: "POST",
    body: body,
    bodyStringified: JSON.stringify(body),
  });

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Read response text for logging
  const responseText = await res.text();

  console.log("[Chat Endpoint] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  // Parse the response
  if (!res.ok) {
    console.warn(`[chat] Unexpected response: ${res.status} ${res.statusText}`);
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[Chat Endpoint] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function login({ username, password } = {}) {
  if (!username || !password) {
    throw new Error("login requires { username, password }");
  }

  const endpoint = `${AUTH_BASE}/auth/login`;
  const body = toFormUrlEncoded({ username, password });

  console.log("[Login API] Sending request:", {
    endpoint,
    method: "POST",
    body: body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const responseText = await res.text();
  console.log("[Login API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[Login API] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function register({ username, email, password } = {}) {
  if (!username || !email || !password) {
    throw new Error("register requires { username, email, password }");
  }

  const endpoint = `${AUTH_BASE}/auth/register`;
  const body = { username, email, password };

  console.log("[Register API] Sending request:", {
    endpoint,
    method: "POST",
    body: body,
    bodyStringified: JSON.stringify(body),
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("[Register API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[Register API] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function getCurrentUser(accessToken) {
  const headers = buildAuthHeaders(accessToken);
  const endpoint = `${AUTH_BASE}/users/me`;

  console.log("[GetCurrentUser API] Sending request:", {
    endpoint,
    method: "GET",
    headers: {
      ...headers,
      Authorization: headers.Authorization ? "Bearer ***" : undefined,
    },
  });

  const res = await fetch(endpoint, {
    method: "GET",
    headers,
  });

  const responseText = await res.text();
  console.log("[GetCurrentUser API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[GetCurrentUser API] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function updateCurrentUser(accessToken, payload = {}) {
  const headers = buildAuthHeaders(accessToken, {
    "Content-Type": "application/json",
  });
  const endpoint = `${AUTH_BASE}/users/me`;

  console.log("[UpdateCurrentUser API] Sending request:", {
    endpoint,
    method: "PUT",
    headers: {
      ...headers,
      Authorization: headers.Authorization ? "Bearer ***" : undefined,
    },
    body: payload,
    bodyStringified: JSON.stringify(payload),
  });

  const res = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log("[UpdateCurrentUser API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[UpdateCurrentUser API] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function changePassword(
  accessToken,
  { currentPassword, newPassword } = {}
) {
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

  console.log("[ChangePassword API] Sending request:", {
    endpoint,
    method: "POST",
    headers: {
      ...headers,
      Authorization: headers.Authorization ? "Bearer ***" : undefined,
    },
    body: { ...body, current_password: "***", new_password: "***" },
    bodyStringified: JSON.stringify(body),
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("[ChangePassword API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log("[ChangePassword API] Parsed response data:", responseData);
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function requestPasswordReset(email) {
  if (!email) {
    throw new Error("Email is required");
  }

  const endpoint = `${AUTH_BASE}/auth/password-reset-request`;
  const body = { email };

  console.log("[RequestPasswordReset API] Sending request:", {
    endpoint,
    method: "POST",
    body: body,
    bodyStringified: JSON.stringify(body),
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("[RequestPasswordReset API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText: responseText,
  });

  if (!res.ok) {
    throw new Error(
      `API error ${res.status} ${res.statusText} ${responseText}`
    );
  }

  try {
    const responseData = JSON.parse(responseText);
    console.log(
      "[RequestPasswordReset API] Parsed response data:",
      responseData
    );
    return responseData;
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
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
    Authorization: accessToken.startsWith("Bearer")
      ? accessToken
      : `Bearer ${accessToken}`,
    ...extra,
  };
}

export async function fetchChats(accessToken, { skip = 0, limit = 5 } = {}) {
  const headers = buildAuthHeaders(accessToken);
  const endpoint = `${AUTH_BASE}/chats/?skip=${skip}&limit=${limit}`;

  console.log("[Chats API] Sending request:", {
    endpoint,
    method: "GET",
    headers: { ...headers, Authorization: "Bearer ***" },
  });

  const res = await fetch(endpoint, { method: "GET", headers });
  const responseText = await res.text();
  console.log("[Chats API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status} ${res.statusText} ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}

export async function fetchChatMessages(
  accessToken,
  chatId,
  { skip = 0, limit = 100 } = {}
) {
  if (!chatId) throw new Error("chatId is required");
  const headers = buildAuthHeaders(accessToken);
  const endpoint = `${AUTH_BASE}/chats/${chatId}/messages?skip=${skip}&limit=${limit}`;

  console.log("[ChatMessages API] Sending request:", {
    endpoint,
    method: "GET",
    headers: { ...headers, Authorization: "Bearer ***" },
  });

  const res = await fetch(endpoint, { method: "GET", headers });
  const responseText = await res.text();
  console.log("[ChatMessages API] Received response:", {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    responseText,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status} ${res.statusText} ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error("Invalid JSON response from server");
  }
}
