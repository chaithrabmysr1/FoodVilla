import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

const EmptyState = ({ icon = "🍽️", message }: { icon?: string; message: string }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 40,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});

export default EmptyState;
