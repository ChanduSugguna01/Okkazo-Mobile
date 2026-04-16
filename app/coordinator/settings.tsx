import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/providers/AuthProvider";
import { getUnreadNotificationCount } from "@/src/services/notifications";
import { palette } from "@/src/theme/palette";
import { resolveHomeRoute } from "@/src/utils/roleRouting";
import CoordinatorBottomMenu from "../../src/components/coordinator/CoordinatorBottomMenu";

const SettingRow = ({
  icon,
  label,
  value,
  onValueChange,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  hint: string;
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIconWrap}>
      <Ionicons name={icon} size={18} color={palette.main} />
    </View>
    <View style={styles.settingTextWrap}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingHint}>{hint}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#3d4150", true: "#658ff7" }}
      thumbColor={value ? "#d6e2ff" : "#b2b7c5"}
    />
  </View>
);

export default function CoordinatorSettingsPage() {
  const { top } = useSafeAreaInsets();
  const { session, profile } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);

  useEffect(() => {
    const loadUnread = async () => {
      if (!session?.accessToken) return;
      const count = await getUnreadNotificationCount(session.accessToken).catch(() => 0);
      setUnreadCount(count);
    };

    loadUnread();
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (resolveHomeRoute(profile, session.role) !== "/coordinator") {
    return <Redirect href="/coming-soon" />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(top, 32) + 16 }]}> 
        <Text style={styles.headerEyebrow}>COORDINATOR CONSOLE</Text>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Tune your notifications and app behavior for smoother event operations.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            hint="Receive updates for event assignments and guest actions."
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <SettingRow
            icon="mail-outline"
            label="Email Notifications"
            hint="Get important workflow summaries in your inbox."
            value={emailEnabled}
            onValueChange={setEmailEnabled}
          />
          <SettingRow
            icon="moon-outline"
            label="Quiet Hours"
            hint="Silence non-critical notifications after shifts."
            value={quietHoursEnabled}
            onValueChange={setQuietHoursEnabled}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Security</Text>
          <SettingRow
            icon="finger-print-outline"
            label="Biometric Unlock"
            hint="Require biometric verification when opening app."
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
          />

          <Pressable style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}>
            <Ionicons name="refresh-outline" size={16} color={palette.main} />
            <Text style={styles.secondaryActionText}>Refresh Session Permissions</Text>
          </Pressable>
        </View>

      </ScrollView>

      <CoordinatorBottomMenu activeMenu="settings" unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 14,
  },
  headerEyebrow: {
    color: palette.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  headerTitle: {
    color: palette.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(177, 197, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextWrap: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  settingHint: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryAction: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(177, 197, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionPressed: {
    backgroundColor: "rgba(177, 197, 255, 0.08)",
  },
  secondaryActionText: {
    color: palette.main,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
