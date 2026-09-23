import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError, signupThunk } from "../../store/slices/authSlice";
import PrimaryButton from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import type { RootStackScreenProps } from "../../types/navigation";

const SignupScreen = ({ navigation }: RootStackScreenProps<"Signup">) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.auth.error);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  const handleSignup = async () => {
    dispatch(clearError());
    setMessage("");
    setSubmitting(true);
    const result = await dispatch(signupThunk(form));
    setSubmitting(false);
    if (signupThunk.fulfilled.match(result)) {
      setMessage("Account created! Redirecting to login...");
      setTimeout(() => navigation.replace("Login"), 1200);
    }
  };

  const canSubmit = Object.values(form).every((v) => v.trim().length > 0);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.success}>{message}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={form.fullName}
          onChangeText={(v) => update("fullName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(v) => update("email", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={form.password}
          onChangeText={(v) => update("password", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={form.phoneNumber}
          onChangeText={(v) => update("phoneNumber", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={form.address}
          onChangeText={(v) => update("address", v)}
        />

        <PrimaryButton title="Sign Up" onPress={handleSignup} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.md,
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
  },
  success: {
    color: colors.success,
    textAlign: "center",
  },
});

export default SignupScreen;
