import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as orderApi from "../api/orderApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearCart } from "../store/slices/cartSlice";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { RootStackScreenProps } from "../types/navigation";

const CheckoutScreen = ({ navigation }: RootStackScreenProps<"Checkout">) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const address = useAppSelector((s) => s.checkout.selectedAddress);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const displaySubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!address || cartItems.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const idempotencyKey = Crypto.randomUUID();
      const res = await orderApi.createOrder(
        {
          restaurantId: cartItems[0].restaurantId,
          items: cartItems.map((i) => ({ foodItemId: i.id, quantity: i.quantity })),
          deliveryAddress: address,
        },
        idempotencyKey
      );
      // Cart only clears once the backend has confirmed the order exists —
      // a failed request here leaves it untouched so the user can retry.
      dispatch(clearCart());
      navigation.replace("Payment", { orderId: res.data.id });
    } catch (err: any) {
      setError(err.response?.data?.message || "We couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!address) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Please select a delivery address first.</Text>
        <PrimaryButton title="Select Address" onPress={() => navigation.navigate("Address")} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.itemName} × {item.quantity}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={styles.subtotalLabel}>Subtotal (estimate)</Text>
          <Text style={styles.subtotalValue}>{formatCurrency(displaySubtotal)}</Text>
        </View>
        <Text style={styles.note}>
          Delivery fee, tax and the final total are calculated by the server when your order is placed.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivering to</Text>
        <Text style={styles.addressText}>{address.recipientName} · {address.phone}</Text>
        <Text style={styles.addressText}>
          {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}
        </Text>
        <Text style={styles.addressText}>{address.city}, {address.state} - {address.pincode}</Text>
        <PrimaryButton
          title="Change address"
          variant="secondary"
          onPress={() => navigation.navigate("Address")}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton title="Place Order" onPress={handlePlaceOrder} loading={submitting} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 13,
    color: colors.text,
    flexShrink: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  note: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  addressText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
});

export default CheckoutScreen;
