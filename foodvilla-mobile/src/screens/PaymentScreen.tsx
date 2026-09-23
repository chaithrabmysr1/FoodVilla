import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as orderApi from "../api/orderApi";
import * as paymentApi from "../api/paymentApi";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { Order, Payment } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const PaymentScreen = ({ route, navigation }: RootStackScreenProps<"Payment">) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const orderRes = await orderApi.getOrderById(orderId);
      setOrder(orderRes.data);
      const paymentRes = await paymentApi.initiatePayment(orderId);
      setPayment(paymentRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't start payment for this order.");
    } finally {
      setLoading(false);
    }
  };

  // Standard fetch-on-mount pattern — intentional, not a bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [orderId]);

  const handlePay = async () => {
    if (!payment) return;
    if (payment.provider !== "MOCK") {
      setError(
        `Payment provider "${payment.provider}" isn't supported by this app's checkout yet — only mock mode is wired up.`
      );
      return;
    }
    setPaying(true);
    setError("");
    try {
      await paymentApi.confirmPayment(payment.id);
      navigation.replace("OrderConfirmation", { orderId });
    } catch (err: any) {
      setError(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <LoadingView label="Preparing payment..." />;
  if (error && !payment) return <ErrorView message={error} onRetry={load} />;
  if (!order || !payment) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Order #{order.id}</Text>
        <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
        <Text style={styles.provider}>
          {payment.provider === "MOCK" ? "Mock payment (no real money involved)" : `Provider: ${payment.provider}`}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton title={`Pay ${formatCurrency(payment.amount)}`} onPress={handlePay} loading={paying} />
      <Text style={styles.disclaimer}>
        This is a local-development mock payment — tapping Pay simulates a successful checkout without
        charging anything.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  amount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
  },
  provider: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: "center",
  },
});

export default PaymentScreen;
