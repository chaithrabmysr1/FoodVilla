import {
  createPayment,
  reportPaymentFailure,
  syncPayment,
  verifyPayment,
} from "../services/paymentApi";
import { tokenClaims } from "./jwt";

// Razorpay Checkout runs in TEST MODE only (the backend refuses live keys), so
// no real money moves. The script is loaded on demand — browsing the app never
// depends on Razorpay being reachable.
const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        scriptPromise = null; // let a later attempt retry
        reject(new Error("Razorpay Checkout failed to load"));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};

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
    case "PAYMENT_NOT_CONFIGURED":
      return {
        code: data.code,
        definitive: false,
        message:
          "Online payment isn't available right now — Razorpay test keys aren't configured on the server.",
      };
    case "PAYMENT_PROVIDER_ERROR":
      return {
        code: data.code,
        definitive: false,
        message: "We couldn't reach Razorpay. Please try again in a moment.",
      };
    case "ORDER_ALREADY_PAID":
      return { code: data.code, definitive, message: "This order has already been paid." };
    case "ORDER_EXPIRED":
      return {
        code: data.code,
        definitive,
        message: "This order wasn't paid in time and can no longer be paid. Please place a new order.",
      };
    case "INVALID_SIGNATURE":
    case "PAYMENT_ORDER_MISMATCH":
      return {
        code: data.code,
        definitive,
        message:
          "We couldn't verify this payment, so your order has NOT been confirmed. Please try paying again.",
      };
    case "AMOUNT_MISMATCH":
    case "ORDER_NOT_PAYABLE":
    case "PAYMENT_NOT_STARTED":
      return { code: data.code, definitive, message: data.message };
    default:
      break;
  }

  if (status === 401) {
    return {
      code: "UNAUTHENTICATED",
      definitive: false,
      message:
        "Your session expired. Log in again, then open your order — we'll check the payment with Razorpay.",
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

// After Razorpay says the customer paid, ONLY the backend can say the order is
// paid. It re-checks Razorpay's signature; if it can't be reached we ask it to
// look the payment up with Razorpay directly rather than guessing.
const confirmWithBackend = async (orderId, response) => {
  const payload = {
    razorpayOrderId: response.razorpay_order_id,
    razorpayPaymentId: response.razorpay_payment_id,
    razorpaySignature: response.razorpay_signature,
  };
  try {
    const res = await verifyPayment(orderId, payload);
    return { outcome: "paid", order: res.data };
  } catch (err) {
    const problem = describePaymentError(err);
    if (problem.code === "ORDER_ALREADY_PAID") return { outcome: "already-paid" };
    if (problem.definitive) return { outcome: "error", ...problem };

    try {
      const res = await syncPayment(orderId);
      if (res.data.paymentStatus === "CONFIRMED") return { outcome: "paid", order: res.data };
    } catch {
      // still can't tell — fall through
    }
    return { outcome: "unconfirmed", paymentId: payload.razorpayPaymentId };
  }
};

// "UPI" and "Card" on the payment-methods screen open the SAME real Razorpay
// Checkout, limited to that one method through Razorpay's display config. Any
// other choice ("razorpay") shows everything Razorpay offers. This is only a
// presentation preference — the payment, its amount and its verification are
// identical.
const displayConfigFor = (method) => {
  if (method !== "upi" && method !== "card") return undefined;
  return {
    display: {
      blocks: {
        [method]: {
          name: method === "upi" ? "Pay with UPI" : "Pay with Card",
          instruments: [{ method }],
        },
      },
      sequence: [`block.${method}`],
      preferences: { show_default_blocks: false },
    },
  };
};

/**
 * Pays for an existing, unpaid order through Razorpay Checkout (test mode).
 * Always resolves — never rejects — with one of:
 *   { outcome: "paid", order }          the backend verified the payment
 *   { outcome: "already-paid" }         the backend says it was already paid
 *   { outcome: "dismissed", failure? }  the customer closed Checkout (failure =
 *                                       Razorpay's last error, if an attempt failed)
 *   { outcome: "unconfirmed", paymentId } Razorpay took the payment but the
 *                                       backend couldn't confirm it yet
 *   { outcome: "error", code, message } it could not start, or was rejected
 *
 * `onVerifying` fires when Razorpay hands back a payment and the backend check
 * begins, so the page can say "Confirming your payment…" (not "successful").
 * `method` ("razorpay" | "upi" | "card") only chooses which Razorpay methods to show.
 */
export const payForOrder = async (order, user, { onVerifying, method } = {}) => {
  let session;
  try {
    const res = await createPayment(order.id, order.finalAmount);
    session = res.data;
  } catch (err) {
    const problem = describePaymentError(err);
    if (problem.code === "ORDER_ALREADY_PAID") return { outcome: "already-paid" };
    return { outcome: "error", ...problem };
  }

  try {
    await loadRazorpayCheckout();
  } catch {
    return {
      outcome: "error",
      code: "CHECKOUT_LOAD_FAILED",
      message:
        "Couldn't load Razorpay Checkout. Check your connection or disable content blockers, then try again.",
    };
  }

  return new Promise((resolve) => {
    let handling = false; // Razorpay returned a payment; the modal closing after this is not a cancel
    let lastFailure = null;

    const checkout = new window.Razorpay({
      key: session.keyId, // PUBLIC key id — the secret never reaches the browser
      amount: session.amount,
      currency: session.currency,
      name: "FoodVilla",
      description: `Order #${order.id} · ${order.restaurantName}`,
      order_id: session.razorpayOrderId,
      prefill: {
        name: user?.fullName || "",
        email: tokenClaims().sub || "",
        contact: user?.phoneNumber || "",
      },
      notes: { orderId: String(order.id) },
      theme: { color: "#28a745" },
      config: displayConfigFor(method),
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (!handling) resolve({ outcome: "dismissed", failure: lastFailure });
        },
      },
      handler: async (response) => {
        handling = true;
        onVerifying?.();
        resolve(await confirmWithBackend(order.id, response));
      },
    });

    // A failed attempt doesn't close Checkout — the customer can retry inside
    // it. Record it, but only a verified signature can make the order paid.
    checkout.on("payment.failed", (event) => {
      lastFailure = event.error || null;
      reportPaymentFailure(order.id, {
        razorpayOrderId: session.razorpayOrderId,
        razorpayPaymentId: event.error?.metadata?.payment_id,
        code: event.error?.code,
        description: event.error?.description,
      }).catch(() => {
        // Best effort: the failure is informational.
      });
    });

    checkout.open();
  });
};
