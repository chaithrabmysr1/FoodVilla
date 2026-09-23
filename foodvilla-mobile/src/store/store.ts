import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer, { logoutThunk } from "./slices/authSlice";
import cartReducer, { CART_KEY } from "./slices/cartSlice";
import notificationReducer, { resetNotifications } from "./slices/notificationSlice";
import checkoutReducer from "./slices/checkoutSlice";
import { setUnauthorizedHandler } from "../api/apiClient";

// Persists the cart to AsyncStorage after every mutation — mobile has no
// localStorage, and cart state needs to survive an app restart the same
// way it does on web.
const listenerMiddleware = createListenerMiddleware();
listenerMiddleware.startListening({
  predicate: (action) => action.type.startsWith("cart/") && action.type !== "cart/load/pending",
  effect: async (_action, api) => {
    const state = api.getState() as RootState;
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(state.cart.items));
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    notifications: notificationReducer,
    checkout: checkoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

// A 401 from any request clears the session and drops the user back to
// login — wired here (not in apiClient.ts) to avoid a circular import
// between the store and the client every API module depends on.
setUnauthorizedHandler(() => {
  store.dispatch(logoutThunk());
  store.dispatch(resetNotifications());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
