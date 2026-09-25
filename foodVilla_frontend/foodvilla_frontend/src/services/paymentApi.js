import apiClient from "./apiClient";

// Simulated payments — served by order-service behind the gateway. There is no
// payment gateway: the backend records the payment and confirms the order.

// payload: { method, detail?, amount? }
//  - method: UPI | CARD | NETBANKING | PAYTM | PAYPAL
//  - detail: an already-masked label for the receipt ("Visa •••• 1111"). A full
//    card number, CVV or expiry is never sent.
//  - amount: advisory. The backend pays the total stored on the order and refuses
//    (409 AMOUNT_MISMATCH) if the figure the customer saw differs.
export const payOrder = (orderId, payload) =>
  apiClient.post(`/api/orders/${orderId}/payment/pay`, payload);
