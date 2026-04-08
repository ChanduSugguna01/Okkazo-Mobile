import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { palette } from "@/src/theme/palette";
import { resolveHomeRoute } from "@/src/utils/roleRouting";

export default function Index() {
  const { session, profile, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={palette.main} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const homeRoute = resolveHomeRoute(profile, session.role);

  if (homeRoute === "/login") {
    return <Redirect href="/login" />;
  }

  return <Redirect href={homeRoute} />;
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.secondary,
  },
});
