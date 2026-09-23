import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartItem } from "../../types/models";

const CART_KEY = "foodvilla_cart";

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

const initialState: CartState = {
  items: [],
  hydrated: false,
};

export const loadCart = createAsyncThunk("cart/load", async () => {
  const raw = await AsyncStorage.getItem(CART_KEY);
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
});

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // The screen is responsible for asking "replace your cart?" (via
    // Alert.alert) BEFORE dispatching this when the restaurant differs —
    // the reducer itself stays a dumb state transition.
    addOrUpdateItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        existing.quantity = action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    incrementItem(state, action: PayloadAction<number>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.quantity += 1;
    },
    decrementItem(state, action: PayloadAction<number>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
          state.items = state.items.filter((i) => i.id !== action.payload);
        }
      }
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadCart.fulfilled, (state, action) => {
      state.items = action.payload;
      state.hydrated = true;
    });
  },
});

export const { addOrUpdateItem, incrementItem, decrementItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
export { CART_KEY };
