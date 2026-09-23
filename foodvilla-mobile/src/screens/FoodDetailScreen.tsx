import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import * as catalogueApi from "../api/catalogueApi";
import LoadingView from "../components/LoadingView";
import ErrorView from "../components/ErrorView";
import PrimaryButton from "../components/PrimaryButton";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addOrUpdateItem, clearCart } from "../store/slices/cartSlice";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { CatalogueResponse, FoodItem } from "../types/models";
import type { RootStackScreenProps } from "../types/navigation";

const FoodDetailScreen = ({ route, navigation }: RootStackScreenProps<"FoodDetail">) => {
  const { foodItemId, restaurantId } = route.params;
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);

  const [data, setData] = useState<CatalogueResponse | null>(null);
  const [item, setItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  const load = () => {
    setLoading(true);
    setError("");
    catalogueApi
      .getCatalogueByRestaurant(restaurantId)
      .then((res) => {
        setData(res.data);
        const found = res.data.foodItems.find((f) => f.id === foodItemId) || null;
        setItem(found);
        const existing = cartItems.find((i) => i.id === foodItemId);
        setQuantity(existing?.quantity || 1);
      })
      .catch(() => setError("Couldn't load this item."))
      .finally(() => setLoading(false));
  };

  // Standard fetch-on-mount/param-change pattern — intentional, not a bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(load, [foodItemId, restaurantId]);

  const handleAddToCart = () => {
    if (!item || !data) return;
    const cartRestaurantId = cartItems[0]?.restaurantId;
    const commit = () => {
      dispatch(
        addOrUpdateItem({
          id: item.id,
          itemName: item.itemName,
          price: item.price,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          restaurantId,
          restaurantName: data.restaurant.name,
          quantity,
        })
      );
      navigation.goBack();
    };

    if (cartItems.length > 0 && cartRestaurantId !== restaurantId) {
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
              commit();
            },
          },
        ]
      );
      return;
    }
    commit();
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!item) return <ErrorView message="Item not found." />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={{ uri: item.imageUrl || "https://placehold.co/600x400?text=Food" }}
        style={styles.image}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.vegDot}>{item.isVeg ? "🟢" : "🔴"}</Text>
          <Text style={styles.name}>{item.itemName}</Text>
        </View>
        <Text style={styles.description}>{item.itemDescription}</Text>
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>

        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Quantity</Text>
          <View style={styles.stepper}>
            <PrimaryButton
              title="−"
              variant="secondary"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={styles.stepperBtn}
            />
            <Text style={styles.stepperValue}>{quantity}</Text>
            <PrimaryButton
              title="+"
              variant="secondary"
              onPress={() => setQuantity((q) => q + 1)}
              style={styles.stepperBtn}
            />
          </View>
        </View>

        <PrimaryButton
          title={`Add ${quantity} to Cart · ${formatCurrency(item.price * quantity)}`}
          onPress={handleAddToCart}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  image: {
    width: "100%",
    height: 220,
    backgroundColor: colors.border,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vegDot: {
    fontSize: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.sm,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepperBtn: {
    width: 40,
    paddingVertical: 8,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
});

export default FoodDetailScreen;
