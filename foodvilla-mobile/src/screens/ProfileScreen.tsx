import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutThunk } from "../store/slices/authSlice";
import { resetNotifications } from "../store/slices/notificationSlice";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { MainTabScreenProps } from "../types/navigation";

const ProfileScreen = ({ navigation }: MainTabScreenProps<"ProfileTab">) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    Alert.alert("Log out?", "You will need to log in again to place orders.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          dispatch(logoutThunk());
          dispatch(resetNotifications());
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.card}>
        <Row icon="mail-outline" label="Email" value={user?.email || "-"} />
        <Row icon="call-outline" label="Phone" value={user?.phoneNumber || "-"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Saved Address</Text>
        <Row icon="location-outline" label="Address" value={user?.address || "Not set"} />
        <Text style={styles.hint}>
          Multi-address management is not available yet — this is the address from your profile,
          used to prefill checkout.
        </Text>
      </View>

      <ScrollView>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Help")}>
          <Ionicons name="help-circle-outline" size={20} color={colors.text} />
          <Text style={styles.linkText}>Help & Support</Text>
        </TouchableOpacity>
      </ScrollView>

      <PrimaryButton title="Log Out" variant="danger" onPress={handleLogout} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
};

const Row = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={18} color={colors.textMuted} />
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "800",
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  role: {
    fontSize: 12,
    color: colors.textLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
  },
  hint: {
    fontSize: 11,
    color: colors.textLight,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: 14,
    color: colors.text,
  },
});

export default ProfileScreen;
