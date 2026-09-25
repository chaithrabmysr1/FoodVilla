import { tokenClaims } from "./jwt";

// A checkout that has created an order but not finished paying for it.
//
// Why this exists: order creation is idempotent per Idempotency-Key, and the
// customer can refresh or close the tab while Razorpay Checkout is open. If the
// page then came back with a brand-new key it would create a SECOND order for
// the same cart. Persisting the key (and the order id) lets a reload pick the
// same order up again, and lets the page ask the backend whether it was paid.
//
// It is keyed to the exact cart + delivery address (`signature`): change either
// and it is a different order, so a different key is used.

const STORAGE_KEY = "foodvilla.pendingCheckout";

export const checkoutSignature = (restaurantId, cartItems, address) =>
  JSON.stringify({
    restaurantId,
    items: cartItems.map((item) => [item.id, item.quantity]).sort((a, b) => a[0] - b[0]),
    address,
  });

export const readPendingCheckout = () => {
  try {
    const record = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Never let one customer's saved checkout leak into another's session.
    if (record && record.userId === tokenClaims().userId) return record;
  } catch {
    // unreadable / unavailable storage: behave as if nothing was saved
  }
  return null;
};

export const savePendingCheckout = (record) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, userId: tokenClaims().userId }));
  } catch {
    // private mode etc. — the server-side idempotency still protects the current page
  }
};

export const clearPendingCheckout = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
};
