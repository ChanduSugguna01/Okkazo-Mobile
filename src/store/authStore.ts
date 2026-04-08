import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { fetchMyProfile, loginWithEmail, loginWithGoogle } from "@/src/services/auth";
import { AuthSession, LoginResponse, UserProfile } from "@/src/types/auth";

const STORAGE_KEY = "okkazo.mobile.auth.session.v1";

interface AuthStoreState {
  session: AuthSession | null;
  profile: UserProfile | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (accessToken: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const toSession = (response: LoginResponse): AuthSession => ({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
  role: response.role,
  authProvider: response.authProvider,
});

const persistSession = async (session: AuthSession | null) => {
  if (!session) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
};

const restoreSession = async (): Promise<AuthSession | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { session?: AuthSession };
    return parsed.session?.accessToken ? parsed.session : null;
  } catch {
    return null;
  }
};

const applyAuthenticatedState = async (set: (state: Partial<AuthStoreState>) => void, nextSession: AuthSession) => {
  const nextProfile = await fetchMyProfile(nextSession.accessToken);
  set({ session: nextSession, profile: nextProfile });
  await persistSession(nextSession);
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  profile: null,
  isHydrating: true,

  hydrate: async () => {
    if (!get().isHydrating) {
      return;
    }

    try {
      const restored = await restoreSession();
      if (!restored) {
        set({ session: null, profile: null });
        return;
      }

      await applyAuthenticatedState(set, restored);
    } catch {
      set({ session: null, profile: null });
      await persistSession(null);
    } finally {
      set({ isHydrating: false });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    const loginResponse = await loginWithEmail(email.trim(), password);
    await applyAuthenticatedState(set, toSession(loginResponse));
  },

  signInWithGoogle: async (accessToken: string) => {
    const loginResponse = await loginWithGoogle(accessToken);
    await applyAuthenticatedState(set, toSession(loginResponse));
  },

  refreshProfile: async () => {
    const accessToken = get().session?.accessToken;
    if (!accessToken) {
      return;
    }

    const nextProfile = await fetchMyProfile(accessToken);
    set({ profile: nextProfile });
  },

  signOut: async () => {
    set({ session: null, profile: null });
    await persistSession(null);
  },
}));
