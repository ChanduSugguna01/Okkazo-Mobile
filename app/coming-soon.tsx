import { Redirect } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { palette } from "@/src/theme/palette";

export default function ComingSoonPage() {
  const { session, profile, signOut, isHydrating } = useAuth();

  if (!isHydrating && !session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.heroCard}>
        <Text style={styles.badge}>Access Preview</Text>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>
          Your current role is {String(profile?.role ?? session?.role ?? "UNKNOWN").toUpperCase()}.
        </Text>
        <Text style={styles.copy}>
          This section is under development. Once your dashboard is enabled you will land here automatically.
        </Text>

        {String(profile?.role ?? session?.role).toUpperCase() === "MANAGER" ? (
          <View style={styles.metaWrap}>
            <Text style={styles.metaText}>Assigned Role: {profile?.assignedRole ?? "-"}</Text>
            <Text style={styles.metaText}>Department: {profile?.department ?? "-"}</Text>
          </View>
        ) : null}

        <Pressable onPress={signOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
    justifyContent: "center",
    padding: 20,
  },
  heroCard: {
    backgroundColor: palette.main,
    borderRadius: 20,
    padding: 22,
    borderColor: palette.accent,
    borderWidth: 1,
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    color: "#481d00",
    backgroundColor: palette.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: palette.textPrimary,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  copy: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  metaWrap: {
    marginTop: 6,
    gap: 4,
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 12,
  },
  metaText: {
    color: palette.textPrimary,
    fontSize: 13,
  },
  button: {
    marginTop: 14,
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: palette.main,
    fontWeight: "700",
    fontSize: 15,
  },
});
