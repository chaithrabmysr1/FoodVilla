import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";

// Login gates the whole app on mobile (common pattern for food-delivery
// apps, unlike the web version which allows anonymous browsing) — Splash
// routes to either the auth screens or MainTabs based on restored token.
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  RestaurantDetails: { restaurantId: number };
  FoodDetail: { foodItemId: number; restaurantId: number };
  Cart: undefined;
  Address: undefined;
  Checkout: undefined;
  Payment: { orderId: number };
  OrderConfirmation: { orderId: number };
  OrderTracking: { orderId: number; justPlaced?: boolean };
  Notifications: undefined;
  Help: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
