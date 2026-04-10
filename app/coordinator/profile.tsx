import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/providers/AuthProvider";
import { palette } from "@/src/theme/palette";

export default function CoordinatorProfilePage() {
  const { top } = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(top, 32) + 16 }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={() => router.back()} 
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} /> {/* Spacer to balance the header */}
        </View>

        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={54} color={palette.surface} />
          </View>
          <Text style={styles.profileName}>{profile?.name ?? "Team Member"}</Text>
          <Text style={styles.profileRole}>{(profile?.role ?? "Coordinator").toUpperCase()}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-outline" size={20} color={palette.main} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profile?.email ?? "Not available"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="call-outline" size={20} color={palette.main} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                {/* Fallback to simulated number if not in user model */}
                <Text style={styles.infoValue}>{profile?.phone ?? "+1 (555) 000-0000"}</Text> 
              </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="business-outline" size={20} color={palette.main} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{profile?.role ?? "Coordinator"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsBox}>
          <Pressable 
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }} 
            style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
          >
            <Ionicons name="log-out-outline" size={20} color={palette.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
// ... remaining styles unchanged

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: palette.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  avatarWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.main,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: palette.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 26,
    fontWeight: "800",
    color: palette.textPrimary,
    letterSpacing: -0.5,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.accent,
    letterSpacing: 1.5,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: palette.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextCol: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textMuted,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(66, 70, 84, 0.5)",
    marginLeft: 80, // aligned with the text
  },
  actionsBox: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
    borderRadius: 100,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.15)",
  },
  signOutPressed: {
    backgroundColor: "rgba(255, 180, 171, 0.15)",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.danger,
  },
});
