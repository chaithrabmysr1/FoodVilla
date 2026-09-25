import { getOrderById } from "../services/orderApi";
import { payOrder } from "../services/paymentApi";

// Payments are simulated: the backend records them and confirms the order. The
// pauses below are only there so the customer sees "processing" and then
// "successful" instead of the page flashing past.
const PROCESSING_MS = 1600;
export const SUCCESS_PAUSE_MS = 1300;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Turns a failed API call into something the UI can show and act on.
// `definitive` = the server answered and said no (a 4xx). Anything else — no
// response, a 5xx, a bad gateway — means we don't know what happened.
export const describePaymentError = (err) => {
  const status = err.response?.status;
  const data = err.response?.data;

  if (!err.response) {
    return {
      code: "NETWORK",
      definitive: false,
      message: "We couldn't reach the server. Check your connection and try again.",
    };
  }

  const definitive = status < 500;
  switch (data?.code) {
    case "ORDER_ALREADY_PAID":
      return { code: data.code, definitive, message: "This order has already been paid." };
    case "ORDER_EXPIRED":
      return {
        code: data.code,
        definitive,
        message: "This order wasn't paid in time and can no longer be paid. Please place a new order.",
      };
    case "AMOUNT_MISMATCH":
    case "ORDER_NOT_PAYABLE":
    case "INVALID_PAYMENT_METHOD":
      return { code: data.code, definitive, message: data.message };
    default:
      break;
  }

  if (status === 401) {
    return {
      code: "UNAUTHENTICATED",
      definitive: false,
      message: "Your session expired. Log in again, then open My Orders to continue.",
    };
  }
  if (status === 403) {
    return { code: "FORBIDDEN", definitive, message: "You don't have access to this order." };
  }
  if (status === 404) {
    return { code: "NOT_FOUND", definitive, message: "We couldn't find this order." };
  }
  return {
    code: "UNKNOWN",
    definitive,
    message: data?.message || "Something went wrong. Please try again.",
  };
};

/**
 * Pays an existing, unpaid order with the method the customer chose.
 * Always resolves — never rejects — with one of:
 *   { outcome: "paid", order }          the backend recorded the payment
 *   { outcome: "already-paid" }         the backend says it was already paid
 *   { outcome: "error", code, message } it was refused, or could not be reached
 *
 * `payment` is { method, detail } from summarizePayment — only a masked label,
 * never a card number or CVV.
 */
export const payForOrder = async (order, { method, detail }) => {
  try {
    const [res] = await Promise.all([
      payOrder(order.id, { method, detail, amount: order.finalAmount }),
      sleep(PROCESSING_MS),
    ]);
    return { outcome: "paid", order: res.data };
  } catch (err) {
    const problem = describePaymentError(err);
    if (problem.code === "ORDER_ALREADY_PAID") return { outcome: "already-paid" };

    // Not knowing what happened (dropped connection, 5xx) is not the same as
    // "it failed": the payment may have gone through. Ask before saying no.
    if (!problem.definitive) {
      try {
        const res = await getOrderById(order.id);
        if (res.data.paymentStatus === "CONFIRMED") return { outcome: "paid", order: res.data };
      } catch {
        // still can't tell — report the original problem
      }
    }
    return { outcome: "error", ...problem };
  }
};
