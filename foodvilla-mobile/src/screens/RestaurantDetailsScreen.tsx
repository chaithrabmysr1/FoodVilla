import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as catalogueApi from "../api/catalogueApi";
import FoodCard from "../components/FoodCard";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addOrUpdateItem, clearCart, decrementItem, incrementItem } from "../store/slices/cartSlice";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { CatalogueResponse } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const RestaurantDetailsScreen = ({ route, navigation }: RootStackScreenProps<"RestaurantDetails">) => {
  const { restaurantId } = route.params;
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);

  const [data, setData] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    catalogueApi
      .getCatalogueByRestaurant(restaurantId)
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load this restaurant's menu."))
      .finally(() => setLoading(false));
  };

  // Standard fetch-on-mount pattern — intentional, not a bug.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    navigation.setOptions({ title: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const quantityFor = (foodItemId: number) => cartItems.find((i) => i.id === foodItemId)?.quantity || 0;

  const cartTotalForThisRestaurant = useMemo(
    () =>
      cartItems
        .filter((i) => i.restaurantId === restaurantId)
        .reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cartItems, restaurantId]
  );
  const cartCountForThisRestaurant = useMemo(
    () => cartItems.filter((i) => i.restaurantId === restaurantId).reduce((sum, i) => sum + i.quantity, 0),
    [cartItems, restaurantId]
  );

  // An order can only belong to one restaurant. If the cart already holds
  // items from elsewhere, confirm before replacing it.
  const ensureCartMatchesRestaurant = (): boolean => {
    if (cartItems.length === 0) return true;
    const cartRestaurantId = cartItems[0].restaurantId;
    if (cartRestaurantId === restaurantId) return true;
    return false;
  };

  const handleAdd = (foodItemId: number) => {
    if (!data) return;
    const item = data.foodItems.find((f) => f.id === foodItemId);
    if (!item) return;

    if (!ensureCartMatchesRestaurant()) {
      Alert.alert(
        "Replace your cart?",
        "Your cart has items from another restaurant. Starting a new item here will clear it.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Start New Cart",
            style: "destructive",
            onPress: () => {
              dispatch(clearCart());
              dispatch(
                addOrUpdateItem({
                  id: item.id,
                  itemName: item.itemName,
                  price: item.price,
                  imageUrl: item.imageUrl,
                  isVeg: item.isVeg,
                  restaurantId,
                  restaurantName: data.restaurant.name,
                  quantity: 1,
                })
              );
            },
          },
        ]
      );
      return;
    }

    dispatch(
      addOrUpdateItem({
        id: item.id,
        itemName: item.itemName,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        restaurantId,
        restaurantName: data.restaurant.name,
        quantity: quantityFor(item.id) + 1,
      })
    );
  };

  if (loading) return <LoadingView label="Loading menu..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <ScreenContainer noPadding>
      <FlatList
        data={data.foodItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Image
              source={{ uri: data.restaurant.imageUrl || "https://placehold.co/600x300?text=FoodVilla" }}
              style={styles.headerImage}
            />
            <Text style={styles.name}>{data.restaurant.name}</Text>
            <Text style={styles.description}>{data.restaurant.description}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>⭐ {data.restaurant.rating}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta}>{data.restaurant.deliveryTime}</Text>
            </View>
            <Text style={styles.address}>{data.restaurant.address}</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState message="No food items available." />}
        renderItem={({ item }) => (
          <FoodCard
            item={item}
            quantity={quantityFor(item.id)}
            onPress={() => navigation.navigate("FoodDetail", { foodItemId: item.id, restaurantId })}
            onAdd={() => handleAdd(item.id)}
            onIncrement={() => dispatch(incrementItem(item.id))}
            onDecrement={() => dispatch(decrementItem(item.id))}
          />
        )}
      />

      {cartCountForThisRestaurant > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.cartBarText}>
            {cartCountForThisRestaurant} item{cartCountForThisRestaurant > 1 ? "s" : ""} · {formatCurrency(cartTotalForThisRestaurant)}
          </Text>
          <Text style={styles.cartBarAction}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  dot: {
    marginHorizontal: 6,
    color: colors.textLight,
  },
  address: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  cartBar: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cartBarText: {
    color: colors.surface,
    fontWeight: "700",
  },
  cartBarAction: {
    color: colors.surface,
    fontWeight: "700",
  },
});

export default RestaurantDetailsScreen;
