const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type TrialStatus = {
  endsAt: string;
  active: boolean;
  daysLeft: number;
};

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  accountType: string;
  trial: TrialStatus;
};

type Session = { token: string; user: AuthUser };

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const TOKEN_KEY = "vibevision_token";
const USER_KEY = "vibevision_user";

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "Something went wrong. Please try again.",
      };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Please try again in a moment.",
    };
  }
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function logIn(
  email: string,
  password: string,
): Promise<ApiResult<Session>> {
  const result = await postJson<Session>("/auth/login", { email, password });

  if (result.ok) {
    saveSession(result.data.token, result.data.user);
  }

  return result;
}

// Creates the account (which starts the 31-day trial on the server),
// then logs the new user in straight away.
export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ApiResult<Session>> {
  const created = await postJson<unknown>("/users", input);

  if (!created.ok) {
    return created;
  }

  return logIn(input.email, input.password);
}

export type StreamResult =
  | { status: "ok"; live: boolean; streamUrl: string | null }
  | { status: "login-required" }
  | { status: "trial-expired" }
  | { status: "error"; error: string };

// Asks the server for a venue's stream link. Only works for logged-in
// members whose free trial is still active.
export async function fetchStream(
  venueId: string | number,
): Promise<StreamResult> {
  const token = getToken();

  if (!token) {
    return { status: "login-required" };
  }

  try {
    const response = await fetch(API_URL + "/venues/" + venueId + "/stream", {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await response.json().catch(() => ({}));

    // A missing, invalid or expired login token (they last 1 hour).
    if (
      response.status === 401 ||
      (response.status === 403 && data.code !== "TRIAL_EXPIRED")
    ) {
      clearSession();
      return { status: "login-required" };
    }

    if (response.status === 403) {
      return { status: "trial-expired" };
    }

    if (!response.ok) {
      return {
        status: "error",
        error: data.error ?? "We couldn't load the stream. Please try again.",
      };
    }

    return {
      status: "ok",
      live: Boolean(data.live),
      streamUrl: data.streamUrl ?? null,
    };
  } catch {
    return {
      status: "error",
      error: "Could not reach the server. Please try again in a moment.",
    };
  }
}
