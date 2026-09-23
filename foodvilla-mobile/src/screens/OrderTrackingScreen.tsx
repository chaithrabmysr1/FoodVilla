import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import * as orderApi from "../api/orderApi";
import * as deliveryApi from "../api/deliveryApi";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { Order, OrderStatus, PublicDeliveryPartner } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const CANCELLABLE: OrderStatus[] = [
  "CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "RESTAURANT_PENDING", "RESTAURANT_ACCEPTED",
];
const TERMINAL: OrderStatus[] = ["DELIVERED", "CANCELLED", "PAYMENT_FAILED"];
const POLL_MS = 8000;

const OrderTrackingScreen = ({ route }: RootStackScreenProps<"OrderTracking">) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [partner, setPartner] = useState<PublicDeliveryPartner | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await orderApi.getOrderById(orderId);
      setOrder(res.data);
      setError("");
      if (res.data.deliveryPartnerId) {
        deliveryApi
          .getDeliveryPartnerPublicInfo(res.data.deliveryPartnerId)
          .then((r) => setPartner(r.data))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't load this order.");
    }
  }, [orderId]);

  // Standard fetch-on-mount pattern — intentional, not a bug.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // No native EventSource/WebSocket wired up on mobile (see README —
  // notification-service's SSE stream is browser-only); this polling
  // fallback is the explicitly-sanctioned alternative.
  useEffect(() => {
    if (!order || TERMINAL.includes(order.orderStatus)) return;
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [order, load]);

  const handleCancel = () => {
    Alert.alert("Cancel this order?", "This can't be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const res = await orderApi.cancelOrder(orderId);
            setOrder(res.data);
          } catch (err: any) {
            Alert.alert("Couldn't cancel", err.response?.data?.message || "Please try again.");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (error && !order) return <ErrorView message={error} onRetry={load} />;
  if (!order) return <LoadingView label="Loading order..." />;

  const canCancel = CANCELLABLE.includes(order.orderStatus);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Order #{order.id}</Text>

      <OrderStatusTimeline status={order.orderStatus} history={order.statusHistory} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.foodItemId} style={styles.row}>
            <Text style={styles.rowLabel}>{item.itemName} × {item.quantity}</Text>
            <Text style={styles.rowValue}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.finalAmount)}</Text>
        </View>
        <Text style={styles.paymentStatus}>Payment: {order.paymentStatus}</Text>
      </View>

      {partner && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Partner</Text>
          <Text style={styles.rowLabel}>{partner.name}{partner.vehicleType ? ` · ${partner.vehicleType}` : ""}</Text>
          <Text style={styles.rowValue}>{partner.phone}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.address}>{order.deliveryAddress.recipientName} · {order.deliveryAddress.phone}</Text>
        <Text style={styles.address}>{order.deliveryAddress.addressLine1}</Text>
        <Text style={styles.address}>{order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</Text>
      </View>

      {canCancel && (
        <PrimaryButton title="Cancel Order" variant="danger" onPress={handleCancel} loading={cancelling} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  card: {
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
    fontSize: 13,
    color: colors.text,
  },
  rowValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  paymentStatus: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  address: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default OrderTrackingScreen;
