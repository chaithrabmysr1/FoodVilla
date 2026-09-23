import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { FoodItem } from "../types/models";

interface Props {
  item: FoodItem;
  quantity: number;
  onPress: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

const FoodCard = ({ item, quantity, onPress, onAdd, onIncrement, onDecrement }: Props) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <Image
      source={{ uri: item.imageUrl || "https://placehold.co/150x150?text=Food" }}
      style={styles.image}
    />
    <View style={styles.body}>
      <View style={styles.titleRow}>
        <Text style={styles.vegDot}>{item.isVeg ? "🟢" : "🔴"}</Text>
        <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
      </View>
      <Text style={styles.description} numberOfLines={2}>{item.itemDescription}</Text>
      <Text style={styles.price}>₹{item.price}</Text>
    </View>

    <View style={styles.actions}>
      {quantity > 0 ? (
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={onDecrement}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepValue}>{quantity}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={onIncrement}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vegDot: {
    fontSize: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  description: {
    fontSize: 11,
    color: colors.textMuted,
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  actions: {
    minWidth: 76,
    alignItems: "flex-end",
  },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  addBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
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
    fontSize: 15,
  },
  stepValue: {
    color: colors.surface,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
  },
});

export default FoodCard;
