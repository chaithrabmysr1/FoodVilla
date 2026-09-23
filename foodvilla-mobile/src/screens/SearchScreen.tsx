import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import * as restaurantApi from "../api/restaurantApi";
import * as catalogueApi from "../api/catalogueApi";
import FoodCard from "../components/FoodCard";
import LoadingView from "../components/LoadingView";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addOrUpdateItem, clearCart, decrementItem, incrementItem } from "../store/slices/cartSlice";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { FoodItem } from "../types/models";
import type { MainTabScreenProps } from "../types/navigation";

interface SearchableItem extends FoodItem {
  restaurantName: string;
}

const SearchScreen = ({ navigation }: MainTabScreenProps<"SearchTab">) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const [term, setTerm] = useState("");
  const [allItems, setAllItems] = useState<SearchableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const restaurantsRes = await restaurantApi.getAllRestaurants();
        const results: SearchableItem[] = [];
        await Promise.all(
          restaurantsRes.data.map(async (restaurant) => {
            const catalogueRes = await catalogueApi.getCatalogueByRestaurant(restaurant.id);
            catalogueRes.data.foodItems.forEach((item) => {
              results.push({ ...item, restaurantName: restaurant.name });
            });
          })
        );
        setAllItems(results);
      } catch {
        // Search stays usable with whatever loaded before the failure —
        // this is a best-effort aggregate view, not critical-path.
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const quantityFor = (id: number) => cartItems.find((i) => i.id === id)?.quantity || 0;

  const handleAdd = (item: SearchableItem) => {
    const cartRestaurantId = cartItems[0]?.restaurantId;
    const commit = () =>
      dispatch(
        addOrUpdateItem({
          id: item.id,
          itemName: item.itemName,
          price: item.price,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          quantity: quantityFor(item.id) + 1,
        })
      );

    if (cartItems.length > 0 && cartRestaurantId !== item.restaurantId) {
      Alert.alert(
        "Replace your cart?",
        "Your cart has items from another restaurant. Starting a new item here will clear it.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Start New Cart", style: "destructive", onPress: () => { dispatch(clearCart()); commit(); } },
        ]
      );
      return;
    }
    commit();
  };

  const filtered = term.trim()
    ? allItems.filter((i) => i.itemName.toLowerCase().includes(term.trim().toLowerCase()))
    : [];

  return (
    <ScreenContainer>
      <Text style={styles.title}>Search Food</Text>
      <TextInput
        style={styles.input}
        placeholder="Search for dishes..."
        value={term}
        onChangeText={setTerm}
        autoCapitalize="none"
      />

      {loading ? (
        <LoadingView label="Loading menu data..." />
      ) : term.trim() === "" ? (
        <EmptyState icon="🔍" message="Start typing to search for food across all restaurants." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="😔" message="No food items match your search." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.restaurantLabel}>{item.restaurantName}</Text>
              <FoodCard
                item={item}
                quantity={quantityFor(item.id)}
                onPress={() =>
                  navigation.navigate("FoodDetail", {
                    foodItemId: item.id,
                    restaurantId: item.restaurantId,
                  })
                }
                onAdd={() => handleAdd(item)}
                onIncrement={() => dispatch(incrementItem(item.id))}
                onDecrement={() => dispatch(decrementItem(item.id))}
              />
            </View>
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
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  restaurantLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 4,
    marginLeft: 4,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});

export default SearchScreen;
