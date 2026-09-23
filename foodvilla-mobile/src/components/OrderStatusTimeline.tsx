import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { OrderStatus, OrderStatusHistoryEntry } from "../types/models";

// Mirrors the web app's OrderStatusTimeline and order-service's
// OrderStatusTransitionValidator forward path — kept in sync by hand.
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "CREATED", label: "Order placed" },
  { status: "PAYMENT_PENDING", label: "Payment pending" },
  { status: "PAYMENT_CONFIRMED", label: "Payment confirmed" },
  { status: "RESTAURANT_PENDING", label: "Restaurant received order" },
  { status: "RESTAURANT_ACCEPTED", label: "Restaurant accepted" },
  { status: "PREPARING", label: "Preparing your food" },
  { status: "READY_FOR_PICKUP", label: "Food ready" },
  { status: "DELIVERY_PARTNER_ASSIGNED", label: "Delivery partner assigned" },
  { status: "PICKED_UP", label: "Order picked up" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

function lastNonTerminalStatus(history: OrderStatusHistoryEntry[]): OrderStatus | null {
  const forward = new Set(STEPS.map((s) => s.status));
  const reached = history.map((h) => h.status).filter((s) => forward.has(s));
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

const OrderStatusTimeline = ({
  status,
  history = [],
}: {
  status: OrderStatus;
  history?: OrderStatusHistoryEntry[];
}) => {
  if (status === "CANCELLED" || status === "PAYMENT_FAILED") {
    const reachedBefore = lastNonTerminalStatus(history);
    const label = STEPS.find((s) => s.status === reachedBefore)?.label;
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.terminalBanner,
            { backgroundColor: status === "CANCELLED" ? "#ffefed" : "#fff8e5" },
          ]}
        >
          <Text style={{ color: status === "CANCELLED" ? colors.danger : colors.warning, fontWeight: "700" }}>
            {status === "CANCELLED" ? "❌ Order Cancelled" : "⚠️ Payment Failed"}
          </Text>
        </View>
        {label && <Text style={styles.terminalContext}>Last reached stage: {label}</Text>}
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex;
        const isCurrent = index === currentIndex;
        const icon = isCompleted ? "✓" : isCurrent ? "●" : "○";
        const color = isCompleted ? colors.success : isCurrent ? colors.primary : colors.textLight;
        return (
          <View key={step.status} style={styles.row}>
            <Text style={[styles.icon, { color }]}>{icon}</Text>
            <Text style={[styles.label, { color }, isCurrent && styles.currentLabel]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  label: {
    fontSize: 13,
  },
  currentLabel: {
    fontWeight: "700",
  },
  terminalBanner: {
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  terminalContext: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
  },
});

export default OrderStatusTimeline;
