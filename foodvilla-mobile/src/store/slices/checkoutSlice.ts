import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { DeliveryAddress } from "../../types/models";

interface CheckoutState {
  selectedAddress: DeliveryAddress | null;
}

const initialState: CheckoutState = {
  selectedAddress: null,
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setSelectedAddress(state, action: PayloadAction<DeliveryAddress>) {
      state.selectedAddress = action.payload;
    },
    clearSelectedAddress(state) {
      state.selectedAddress = null;
    },
  },
});

export const { setSelectedAddress, clearSelectedAddress } = checkoutSlice.actions;
export default checkoutSlice.reducer;
