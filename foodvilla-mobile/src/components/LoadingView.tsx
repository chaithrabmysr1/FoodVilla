import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

const LoadingView = ({ label = "Loading..." }: { label?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator color={colors.primary} size="large" />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

export default LoadingView;
