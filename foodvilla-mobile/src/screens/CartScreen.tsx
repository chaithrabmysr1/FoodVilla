import React from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { decrementItem, incrementItem, removeItem } from "../store/slices/cartSlice";
import PrimaryButton from "../components/PrimaryButton";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/format";
import type { RootStackScreenProps } from "../types/navigation";

const CartScreen = ({ navigation }: RootStackScreenProps<"Cart">) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState icon="🛒" message="Your cart is empty." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image
              source={{ uri: item.imageUrl || "https://placehold.co/100x100?text=Food" }}
              style={styles.image}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
              <Text style={styles.price}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => dispatch(decrementItem(item.id))}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{item.quantity}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => dispatch(incrementItem(item.id))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => dispatch(removeItem(item.id))} style={styles.removeBtn}>
              <Text style={styles.removeText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <PrimaryButton title="Proceed to Checkout" onPress={() => navigation.navigate("Address")} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: 160,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  price: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  stepBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stepBtnText: {
    color: colors.surface,
    fontWeight: "700",
  },
  stepValue: {
    color: colors.surface,
    fontWeight: "700",
    minWidth: 16,
    textAlign: "center",
  },
  removeBtn: {
    marginLeft: 4,
  },
  removeText: {
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 15,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
});

export default CartScreen;
