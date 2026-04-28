import { BACKEND_URL } from "@/src/config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const toUrl = (path: string) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
};

const isFormData = (value: unknown): value is FormData => {
  return typeof FormData !== "undefined" && value instanceof FormData;
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const SESSION_STORAGE_KEY = "okkazo.mobile.auth.session.v1";

let cachedHealthOk: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_TTL_MS = 30 * 1000; // 30 seconds

const checkServerHealth = async () => {
  const now = Date.now();
  if (cachedHealthOk !== null && now - lastHealthCheck < HEALTH_TTL_MS) {
    return cachedHealthOk;
  }

  try {
    const res = await fetch(toUrl("/health"), { method: "GET" });
    cachedHealthOk = res.status === 200;
  } catch {
    cachedHealthOk = false;
  }

  lastHealthCheck = Date.now();
  return cachedHealthOk;
};

type StoredSession = {
  accessToken?: string;
  refreshToken?: string;
  role?: string;
  authProvider?: string;
  [key: string]: unknown;
};

const readStoredSession = async (): Promise<StoredSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { session?: StoredSession };
    return parsed.session ?? null;
  } catch {
    return null;
  }
};

const writeStoredSession = async (session: StoredSession | null) => {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ session }));
};

const tryRefreshToken = async (refreshToken?: string) => {
  if (!refreshToken) return null;

  try {
    const res = await fetch(toUrl("/auth/refresh-token"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const payload = await safeJson(res as unknown as Response);
    if (!res.ok) return null;

    // Expecting { accessToken, refreshToken, ... }
    return payload as { accessToken?: string; refreshToken?: string } | null;
  } catch {
    return null;
  }
};

const pickMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = "GET", token, body, headers, signal } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(headers ?? {}),
  };

  // Use passed token if available, otherwise fall back to stored session accessToken
  let accessToken = token;
  if (!accessToken) {
    const stored = await readStoredSession();
    accessToken = stored?.accessToken ?? undefined;
  }

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData(body)) {
      payload = body;
    } else {
      requestHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(toUrl(path), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
    });
  } catch (error) {
    const healthy = await checkServerHealth();
    if (!healthy) {
      throw new ApiError("Service unavailable", 503, null);
    }
    throw error;
  }
  // If unauthorized, try refreshing the token once and retry
  if (response.status === 401) {
    const stored = await readStoredSession();
    const refreshed = await tryRefreshToken(stored?.refreshToken);
    if (refreshed?.accessToken) {
      // persist new tokens
      await writeStoredSession({
        ...(stored ?? {}),
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? stored?.refreshToken,
      });

      // retry request with new access token
      const retryHeaders = { ...requestHeaders, Authorization: `Bearer ${refreshed.accessToken}` };
      try {
        response = await fetch(toUrl(path), { method, headers: retryHeaders, body: payload, signal });
      } catch (error) {
        const healthy = await checkServerHealth();
        if (!healthy) {
          throw new ApiError("Service unavailable", 503, null);
        }
        throw error;
      }
    }
  }

  const responsePayload = await safeJson(response);

  if (!response.ok) {
    // If still unauthorized after refresh, clear stored session
    if (response.status === 401) {
      await writeStoredSession(null);
    }

    // For upstream/down backend failures, normalize to service unavailable.
    if (response.status >= 500) {
      throw new ApiError("Service unavailable", 503, responsePayload);
    }

    const message = pickMessage(responsePayload, `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, responsePayload);
  }

  return responsePayload as T;
};
