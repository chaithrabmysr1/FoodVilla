import React, { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../store/slices/notificationSlice";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatDateTime } from "../utils/format";

const POLL_MS = 15000;

const NotificationsScreen = () => {
  const dispatch = useAppDispatch();
  const { items, loaded } = useAppSelector((s) => s.notifications);
  const [refreshing, setRefreshing] = React.useState(false);

  // Real-time notifications rely on a browser-only SSE stream on the web
  // app (see notification-service). React Native has no native EventSource,
  // so this screen polls instead while focused — the explicitly-sanctioned
  // fallback for platforms without a live push channel wired up yet.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchNotifications());
      const interval = setInterval(() => dispatch(fetchNotifications()), POLL_MS);
      return () => clearInterval(interval);
    }, [dispatch])
  );

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchNotifications()).finally(() => setRefreshing(false));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => dispatch(markAllNotificationsRead())}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loaded && items.length === 0 ? (
        <EmptyState icon="🔔" message="No notifications yet." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => !item.read && dispatch(markNotificationRead(item.id))}
            >
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.notifTime}>{formatDateTime(item.createdAt)}</Text>
            </TouchableOpacity>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  markAll: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    backgroundColor: "#fff6ee",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  notifMessage: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4,
  },
});

export default NotificationsScreen;
