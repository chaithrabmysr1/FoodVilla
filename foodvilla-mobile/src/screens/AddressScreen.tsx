import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSelectedAddress } from "../store/slices/checkoutSlice";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { DeliveryAddress } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const FIELDS: { key: keyof DeliveryAddress; label: string; required: boolean }[] = [
  { key: "recipientName", label: "Recipient name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "addressLine1", label: "Address line 1", required: true },
  { key: "addressLine2", label: "Address line 2 (optional)", required: false },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State", required: true },
  { key: "pincode", label: "Pincode", required: true },
  { key: "landmark", label: "Landmark (optional)", required: false },
];

const AddressScreen = ({ navigation }: RootStackScreenProps<"Address">) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const existing = useAppSelector((s) => s.checkout.selectedAddress);

  const [form, setForm] = useState<DeliveryAddress>(
    existing || {
      recipientName: user?.fullName || "",
      phone: user?.phoneNumber || "",
      addressLine1: user?.address || "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      label: "Home",
    }
  );

  const update = (key: keyof DeliveryAddress, value: string) => setForm({ ...form, [key]: value });

  const canContinue = FIELDS.filter((f) => f.required).every((f) => form[f.key]?.trim());

  const handleContinue = () => {
    dispatch(setSelectedAddress(form));
    navigation.navigate("Checkout");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Where should we deliver?</Text>
        {FIELDS.map((field) => (
          <TextInput
            key={field.key}
            style={styles.input}
            placeholder={field.label}
            value={form[field.key] || ""}
            onChangeText={(v) => update(field.key, v)}
          />
        ))}
        <PrimaryButton title="Continue to Checkout" onPress={handleContinue} disabled={!canContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
});

export default AddressScreen;
