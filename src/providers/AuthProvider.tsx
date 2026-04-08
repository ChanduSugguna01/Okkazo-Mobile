import { PropsWithChildren, useEffect } from "react";

import { useAuthStore } from "@/src/store/authStore";

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
};

export const useAuth = () => {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const signOut = useAuthStore((state) => state.signOut);

  return {
    session,
    profile,
    isHydrating,
    signInWithEmail,
    signInWithGoogle,
    refreshProfile,
    signOut,
  };
};
