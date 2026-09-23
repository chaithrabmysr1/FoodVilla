import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { Restaurant } from "../types/models";

const RestaurantCard = ({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <Image
      source={{ uri: restaurant.imageUrl || "https://placehold.co/300x200?text=FoodVilla" }}
      style={styles.image}
    />
    {!restaurant.isOpen && (
      <View style={styles.closedBadge}>
        <Text style={styles.closedText}>Closed</Text>
      </View>
    )}
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
      <Text style={styles.description} numberOfLines={1}>{restaurant.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{restaurant.deliveryTime}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>₹{restaurant.costForTwo} for two</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 150,
    backgroundColor: colors.border,
  },
  closedBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  closedText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    padding: spacing.md,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dot: {
    marginHorizontal: 6,
    color: colors.textLight,
  },
});

export default RestaurantCard;
