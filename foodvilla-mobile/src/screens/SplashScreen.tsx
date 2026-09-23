import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

const SplashScreen = () => (
  <View style={styles.container}>
    <Text style={styles.logo}>🍔 FoodVilla</Text>
    <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 24 }} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
  },
});

export default SplashScreen;
