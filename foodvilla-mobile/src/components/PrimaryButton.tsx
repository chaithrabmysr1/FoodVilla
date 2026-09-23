import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
}

const PrimaryButton = ({ title, onPress, loading, disabled, variant = "primary", style }: Props) => {
  const backgroundColor =
    variant === "danger" ? colors.danger : variant === "secondary" ? "#6c757d" : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.text}>{title}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15,
  },
});

export default PrimaryButton;
