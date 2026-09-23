import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import OrderHistoryScreen from "../screens/OrderHistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme/colors";
import type { MainTabParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: "home",
  SearchTab: "search",
  OrdersTab: "receipt",
  ProfileTab: "person",
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textLight,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
      ),
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} />
    <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: "Search" }} />
    <Tab.Screen name="OrdersTab" component={OrderHistoryScreen} options={{ title: "Orders" }} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} />
  </Tab.Navigator>
);

export default MainTabs;
