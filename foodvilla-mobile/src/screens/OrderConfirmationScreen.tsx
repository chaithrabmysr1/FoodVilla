import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as orderApi from "../api/orderApi";
import * as restaurantApi from "../api/restaurantApi";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { Order } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const OrderConfirmationScreen = ({ route, navigation }: RootStackScreenProps<"OrderConfirmation">) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Fresh fetch, not trusted-by-navigation — this screen must reflect
      // actual backend order state, not just "we got here without throwing."
      const res = await orderApi.getOrderById(orderId);
      setOrder(res.data);
      try {
        const restaurantRes = await restaurantApi.getRestaurantById(res.data.restaurantId);
        setDeliveryTime(restaurantRes.data.deliveryTime);
      } catch {
        // Non-critical — confirmation still works without an ETA string.
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't confirm your order.");
    } finally {
      setLoading(false);
    }
  };

  // Standard fetch-on-mount pattern — intentional, not a bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [orderId]);

  if (loading) return <LoadingView label="Confirming your order..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!order) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.successBadge}>
        <Text style={styles.checkmark}>✔️</Text>
      </View>
      <Text style={styles.title}>Order Confirmed</Text>
      <Text style={styles.orderId}>Order #{order.id}</Text>

      <View style={styles.card}>
        <Row label="Restaurant" value={order.restaurantName} />
        {order.items.map((item) => (
          <Row key={item.foodItemId} label={`${item.itemName} × ${item.quantity}`} value={formatCurrency(item.subtotal)} small />
        ))}
        <View style={styles.divider} />
        <Row label="Total" value={formatCurrency(order.finalAmount)} bold />
        <Row label="Payment" value={order.paymentStatus} small />
        {deliveryTime && <Row label="Estimated delivery" value={deliveryTime} small />}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivering to</Text>
        <Text style={styles.address}>{order.deliveryAddress.recipientName}, {order.deliveryAddress.addressLine1}</Text>
        <Text style={styles.address}>{order.deliveryAddress.city}, {order.deliveryAddress.state}</Text>
      </View>

      <PrimaryButton
        title="Track Order"
        onPress={() => navigation.replace("OrderTracking", { orderId: order.id, justPlaced: true })}
      />
      <PrimaryButton
        title="View All Orders"
        variant="secondary"
        onPress={() => navigation.navigate("MainTabs", { screen: "OrdersTab" })}
      />
      <PrimaryButton
        title="Continue Shopping"
        variant="secondary"
        onPress={() => navigation.navigate("MainTabs", { screen: "HomeTab" })}
      />
    </ScrollView>
  );
};

const Row = ({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, small && styles.rowSmall]}>{label}</Text>
    <Text style={[styles.rowValue, bold && styles.rowBold, small && styles.rowSmall]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  successBadge: {
    marginTop: spacing.xl,
  },
  checkmark: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.success,
  },
  orderId: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 14,
    color: colors.text,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
  },
  rowSmall: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowBold: {
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  address: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default OrderConfirmationScreen;
