import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/src/theme/palette";

export type CoordinatorMenuKey = "home" | "notifications" | "profile" | "settings";

interface CoordinatorBottomMenuProps {
  activeMenu: CoordinatorMenuKey;
  unreadCount?: number;
}

const MENU_ITEMS: Array<{
  key: CoordinatorMenuKey;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "home", label: "Home", route: "/coordinator", icon: "home-outline", activeIcon: "home" },
  {
    key: "notifications",
    label: "Notifications",
    route: "/coordinator/notifications",
    icon: "notifications-outline",
    activeIcon: "notifications",
  },
  { key: "profile", label: "Profile", route: "/coordinator/profile", icon: "person-outline", activeIcon: "person" },
  { key: "settings", label: "Settings", route: "/coordinator/settings", icon: "settings-outline", activeIcon: "settings" },
];

export default function CoordinatorBottomMenu({ activeMenu, unreadCount = 0 }: CoordinatorBottomMenuProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.bottomMenu, { paddingBottom: Math.max(bottom, 12) }]}>
      <View style={styles.menuDock}>
        {MENU_ITEMS.map((item) => {
          const active = item.key === activeMenu;

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (active) return;
                router.replace(item.route as never);
              }}
              style={({ pressed }) => [
                styles.bottomMenuButton,
                active && styles.bottomMenuButtonActive,
                pressed && !active && styles.bottomMenuButtonPressed,
              ]}
            >
              {active ? <View style={styles.activeIndicator} /> : null}

              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={18}
                  color={active ? "#082257" : palette.textMuted}
                />
                {item.key === "notifications" && unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.bottomMenuText, active && styles.bottomMenuTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "rgba(8, 12, 32, 0.88)",
  },
  menuDock: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(18, 24, 46, 0.97)",
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(177, 197, 255, 0.08)",
    shadowColor: "#000814",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  bottomMenuButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 54,
    gap: 4,
    position: "relative",
  },
  bottomMenuButtonPressed: {
    backgroundColor: "rgba(177, 197, 255, 0.07)",
  },
  bottomMenuButtonActive: {
    backgroundColor: "rgba(177, 197, 255, 0.15)",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 16,
    height: 3,
    borderRadius: 999,
    backgroundColor: palette.main,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  iconWrapActive: {
    backgroundColor: palette.main,
  },
  bottomMenuText: {
    color: palette.textMuted,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  bottomMenuTextActive: {
    color: palette.textPrimary,
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.danger,
    borderWidth: 1,
    borderColor: "#2a2f40",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: "#1c0f0f",
    fontSize: 8,
    fontWeight: "900",
  },
});
