import React from "react";
import { StyleSheet, Text, View } from "react-native";
import PrimaryButton from "./PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

const ErrorView = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>⚠️</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry && <PrimaryButton title="Retry" onPress={onRetry} style={styles.retryButton} />}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  message: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 140,
  },
});

export default ErrorView;
