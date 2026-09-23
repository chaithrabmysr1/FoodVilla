import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { restoreSession } from "../store/slices/authSlice";
import { loadCart } from "../store/slices/cartSlice";
import { colors } from "../theme/colors";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import MainTabs from "./MainTabs";
import RestaurantDetailsScreen from "../screens/RestaurantDetailsScreen";
import FoodDetailScreen from "../screens/FoodDetailScreen";
import CartScreen from "../screens/CartScreen";
import AddressScreen from "../screens/AddressScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import PaymentScreen from "../screens/PaymentScreen";
import OrderConfirmationScreen from "../screens/OrderConfirmationScreen";
import OrderTrackingScreen from "../screens/OrderTrackingScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import HelpScreen from "../screens/HelpScreen";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

const RootNavigator = () => {
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(restoreSession());
    dispatch(loadCart());
  }, [dispatch]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {status === "idle" ? (
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        ) : status === "unauthenticated" ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create Account" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="RestaurantDetails"
              component={RestaurantDetailsScreen}
              options={{ title: "" }}
            />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: "Item details" }} />
            <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Your Cart" }} />
            <Stack.Screen name="Address" component={AddressScreen} options={{ title: "Delivery Address" }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
            <Stack.Screen
              name="OrderConfirmation"
              component={OrderConfirmationScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: "Track Order" }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
            <Stack.Screen name="Help" component={HelpScreen} options={{ title: "Help & Support" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
