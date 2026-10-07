const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
};

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.msg || data?.message || data?.error_description || data?.error || "Erro ao comunicar com o servidor."
    );
  }

  return data;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { url, key } = ensureConfigured();

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse(response);
}

export async function signUp(email: string, password: string): Promise<AuthSession | null> {
  const { url, key } = ensureConfigured();

  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse(response);

  if (!data?.access_token) {
    return null;
  }

  return data;
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const { url, key } = ensureConfigured();

  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  return parseResponse(response);
}

export async function signOutRemote(accessToken: string) {
  const { url, key } = ensureConfigured();

  await fetch(`${url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function getSupabaseRestConfig() {
  return ensureConfigured();
}
