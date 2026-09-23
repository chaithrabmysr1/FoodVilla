import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

const FAQS = [
  { q: "How do I track my order?", a: "Open My Orders and tap any order to see its live status." },
  { q: "Can I cancel my order?", a: "Yes, until the restaurant starts preparing it — after that it can no longer be cancelled." },
  { q: "How do payments work?", a: "This app currently uses a mock payment flow for local development — no real money is charged." },
  { q: "How do I change my delivery address?", a: "You'll be asked to confirm your delivery address at checkout for every order." },
];

const HelpScreen = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Frequently Asked Questions</Text>
    {FAQS.map((item) => (
      <View style={styles.card} key={item.q}>
        <Text style={styles.question}>{item.q}</Text>
        <Text style={styles.answer}>{item.a}</Text>
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  question: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  answer: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default HelpScreen;
