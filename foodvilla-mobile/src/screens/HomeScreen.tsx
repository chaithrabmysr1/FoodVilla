import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as restaurantApi from "../api/restaurantApi";
import RestaurantCard from "../components/RestaurantCard";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { useAppSelector } from "../store/hooks";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { Restaurant } from "../types/models";
import type { MainTabScreenProps } from "../types/navigation";

const HomeScreen = ({ navigation }: MainTabScreenProps<"HomeTab">) => {
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await restaurantApi.getAllRestaurants();
      setRestaurants(res.data);
    } catch {
      setError("Couldn't load restaurants. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Standard fetch-on-mount pattern — intentional, not a bug.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <Text style={styles.logo}>🍔 FoodVilla</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Cart")} style={styles.iconBtn}>
            <Ionicons name="cart-outline" size={24} color={colors.text} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <LoadingView label="Loading restaurants..." />
      ) : error ? (
        <ErrorView message={error} onRetry={load} />
      ) : restaurants.length === 0 ? (
        <EmptyState message="No restaurants found nearby." />
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => navigation.navigate("RestaurantDetails", { restaurantId: item.id })}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  headerIcons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconBtn: {
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "700",
  },
  list: {
    padding: spacing.lg,
  },
});

export default HomeScreen;
