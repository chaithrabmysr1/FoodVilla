// How an order's payment should read to the customer. The backend keeps payment
// state (paymentStatus) separate from order state (orderStatus); this turns the
// pair into one honest label.
//
// paymentStatus values: PENDING, CONFIRMED (= paid), FAILED. "CONFIRMED" is the
// value the database already used before online payments came back — see
// PaymentStatus in order-service for why it isn't called PAID.
export const paymentInfo = (order) => {
  const stillWithUs = order.orderStatus === "CREATED";

  if (order.paymentStatus === "CONFIRMED") {
    return { key: "paid", label: "Paid", tone: "done", awaiting: false, expired: false };
  }
  if (stillWithUs && order.paymentExpired) {
    return { key: "expired", label: "Payment expired", tone: "failed", awaiting: false, expired: true };
  }
  if (order.paymentStatus === "FAILED") {
    return { key: "failed", label: "Payment failed", tone: "failed", awaiting: stillWithUs, expired: false };
  }
  if (stillWithUs) {
    return { key: "pending", label: "Awaiting payment", tone: "active", awaiting: true, expired: false };
  }
  if (order.orderStatus === "CANCELLED") {
    return { key: "unpaid", label: "Not paid", tone: "muted", awaiting: false, expired: false };
  }
  // Still PENDING but already with the restaurant: placed before online
  // payments existed (nothing was ever collected online for it).
  return { key: "none", label: "No online payment", tone: "muted", awaiting: false, expired: false };
};

// What the order is called in headings/chips. An unpaid CREATED order has not
// been placed with the restaurant yet, so it must not read "Order placed".
export const orderHeadline = (order, statusLabel) => {
  const payment = paymentInfo(order);
  if (order.orderStatus === "CREATED" && payment.key !== "paid") {
    return payment.label;
  }
  return statusLabel(order.orderStatus);
};

const METHOD_LABELS = {
  UPI: "UPI",
  CARD: "Credit / Debit Card",
  NETBANKING: "Net Banking",
  PAYTM: "Paytm",
  PAYPAL: "PayPal",
};

export const methodName = (method) => METHOD_LABELS[method] || null;

// "UPI · as•••@okhdfcbank", "Credit / Debit Card · Visa •••• 1111".
export const paymentMethodLabel = (order) => {
  const name = methodName(order.paymentMethod);
  if (name) return order.paymentDetail ? `${name} · ${order.paymentDetail}` : name;
  if (order.paymentId) return "Online payment";
  return null;
};
