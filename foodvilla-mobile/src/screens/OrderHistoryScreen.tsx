import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as orderApi from "../api/orderApi";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency, formatDateTime, formatStatusLabel } from "../utils/format";
import type { Order } from "../types/models";
import type { MainTabScreenProps } from "../types/navigation";

const OrderHistoryScreen = ({ navigation }: MainTabScreenProps<"OrdersTab">) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    orderApi
      .getMyOrders(0, 20)
      .then((res) => setOrders(res.data.content))
      .catch(() => setError("Couldn't load your orders."))
      .finally(() => setLoading(false));
  }, []);

  // Refresh whenever this tab regains focus (e.g. after placing a new order)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading) return <LoadingView label="Loading your orders..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScreenContainer noPadding>
      <Text style={styles.title}>My Orders</Text>
      {orders.length === 0 ? (
        <EmptyState icon="📦" message="No previous orders yet." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("OrderTracking", { orderId: item.id })}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.restaurant}>{item.restaurantName}</Text>
                <Text style={styles.meta}>#{item.id} · {formatDateTime(item.createdAt)}</Text>
                <Text style={styles.meta}>{item.items.length} item{item.items.length > 1 ? "s" : ""}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.status}>{formatStatusLabel(item.orderStatus)}</Text>
                <Text style={styles.total}>{formatCurrency(item.finalAmount)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLeft: {
    flex: 1,
  },
  restaurant: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  status: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  total: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
});

export default OrderHistoryScreen;
