import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AuthSession,
  refreshSession,
  signOutRemote,
} from "@/lib/supabase-api";

const SESSION_STORAGE_KEY = "links-auth-session";

async function get(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

async function save(session: AuthSession) {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function getValid(): Promise<AuthSession | null> {
  const current = await get();

  if (!current?.refresh_token) {
    return current;
  }

  try {
    const refreshed = await refreshSession(current.refresh_token);
    await save(refreshed);
    return refreshed;
  } catch {
    await clear();
    return null;
  }
}

async function clear() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

async function logout() {
  const current = await get();

  if (current?.access_token) {
    try {
      await signOutRemote(current.access_token);
    } catch {
      // Mesmo que o servidor esteja indisponível, remove a sessão local.
    }
  }

  await clear();
}

export const authStorage = {
  get,
  getValid,
  save,
  clear,
  logout,
};
