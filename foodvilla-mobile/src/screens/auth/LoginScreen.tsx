import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError, loginThunk } from "../../store/slices/authSlice";
import PrimaryButton from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import type { RootStackScreenProps } from "../../types/navigation";

const LoginScreen = ({ navigation }: RootStackScreenProps<"Login">) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.auth.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    dispatch(clearError());
    setSubmitting(true);
    await dispatch(loginThunk({ email: email.trim(), password }));
    setSubmitting(false);
    // On success, RootNavigator swaps to the authenticated tree automatically
    // once auth.status flips — no explicit navigate() needed here.
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🍔 FoodVilla</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          title="Login"
          onPress={handleLogin}
          loading={submitting}
          disabled={!email || !password}
          style={{ marginTop: spacing.md }}
        />

        <TouchableOpacity onPress={() => navigation.navigate("Signup")} style={styles.footer}>
          <Text style={styles.footerText}>
            Don&apos;t have an account? <Text style={styles.footerLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  footerText: {
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: "700",
  },
});

export default LoginScreen;
