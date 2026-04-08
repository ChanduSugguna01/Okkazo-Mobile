import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { palette } from "@/src/theme/palette";

// Prevent the splash screen from auto-hiding before state hydration is complete.
SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { isHydrating } = useAuth();

  useEffect(() => {
    if (!isHydrating) {
      SplashScreen.hideAsync();
    }
  }, [isHydrating]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.secondary },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LayoutContent />
    </AuthProvider>
  );
}
