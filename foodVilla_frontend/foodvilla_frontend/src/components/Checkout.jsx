import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { createOrder, getMyOrders, getOrderById, getOrderQuote } from "../services/orderApi";
import { getPaymentConfig, syncPayment } from "../services/paymentApi";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import PaymentMethods from "./PaymentMethods";
import { describePaymentError, payForOrder } from "../utils/paymentFlow";
import {
  checkoutSignature,
  clearPendingCheckout,
  readPendingCheckout,
  savePendingCheckout,
} from "../utils/pendingCheckout";
import "../styles/Cart.css";
import "../styles/Checkout.css";
import "../styles/Payment.css";

const celebrate = () => {
  const duration = 2 * 1000;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 } });
    confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

const REQUIRED_FIELDS = ["recipientName", "phone", "addressLine1", "city", "state", "pincode"];
const ADDRESS_LABELS = ["Home", "Work", "Other"];

// The address the customer gave at signup is their saved delivery address —
// checkout shows it as-is instead of asking for it all over again.
const addressFromProfile = (user) => ({
  recipientName: user?.fullName || "",
  phone: user?.phoneNumber || "",
  addressLine1: user?.address || "",
  addressLine2: "",
  city: user?.city || "",
  state: user?.state || "",
  pincode: user?.pincode || "",
  landmark: "",
  label: "Home",
});

const isComplete = (address) => REQUIRED_FIELDS.every((key) => address[key]?.trim());

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cartItems] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);

  const [address, setAddress] = useState(() => addressFromProfile(user));
  // Accounts created before signup collected city/state/pincode have an
  // incomplete saved address. For those, reuse the address of their last order
  // before asking for anything.
  const [needsFallback] = useState(() => !isComplete(addressFromProfile(user)));
  const [loadingAddress, setLoadingAddress] = useState(needsFallback);
  const [editing, setEditing] = useState(false);
  // "review" (address + items + bill) -> "methods" (choose how to pay). Nothing is
  // created until Razorpay is chosen on the methods step.
  const [step, setStep] = useState("review");
  // idle -> creating (placing the unpaid order) -> paying (Razorpay Checkout is
  // open) -> verifying (the backend is checking the payment) -> idle.
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [paymentConfig, setPaymentConfig] = useState(null);
  // An order exists for this cart but isn't paid yet (payment cancelled/failed).
  const [unpaidOrderId, setUnpaidOrderId] = useState(null);
  // Razorpay took a payment but the backend couldn't confirm it yet.
  const [unconfirmed, setUnconfirmed] = useState(null);
  // Blocks a second click before React has re-rendered the disabled button.
  const busyRef = useRef(false);

  useEffect(() => {
    if (!needsFallback) return;
    let cancelled = false;
    getMyOrders(0, 1)
      .then((res) => {
        const last = res.data?.content?.[0]?.deliveryAddress;
        if (!last || cancelled) return;
        setAddress((prev) => {
          const next = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (last[key]) next[key] = last[key];
          });
          return next;
        });
      })
      .catch(() => {
        // Convenience only — falling through to the form below is fine.
      })
      .finally(() => {
        if (!cancelled) setLoadingAddress(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsFallback]);

  const restaurantId = cartItems[0]?.restaurantId;

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const addressComplete = isComplete(address);
  const showForm = editing || (!loadingAddress && !addressComplete);
  const busy = phase !== "idle";

  // The order is paid and the backend says so: only now does the cart go away.
  const finishSuccess = useCallback(
    (order) => {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      clearPendingCheckout();
      celebrate();
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    },
    [navigate]
  );

  // The real bill (delivery fee, tax, discount, total), priced by the backend
  // with the same rules it applies when the order is created.
  useEffect(() => {
    if (cartItems.length === 0) return;
    let cancelled = false;
    getOrderQuote({
      restaurantId,
      items: cartItems.map((item) => ({ foodItemId: item.id, quantity: item.quantity })),
    })
      .then((res) => {
        if (!cancelled) setQuote(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuoteError(
          err.response?.status === 404
            ? "Some items in your cart are no longer available."
            : "We couldn't calculate your bill right now. Please try again."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [cartItems, restaurantId]);

  // Can we take a payment at all? (Razorpay test keys configured on the server.)
  useEffect(() => {
    let cancelled = false;
    getPaymentConfig()
      .then((res) => {
        if (!cancelled) setPaymentConfig(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentConfig({
            available: false,
            mode: "TEST",
            message: "We couldn't check whether online payment is available. Please try again.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back to checkout after a refresh or a closed tab: if an order was
  // already created for this checkout, ask the backend (which asks Razorpay)
  // whether it was actually paid before offering to pay again.
  useEffect(() => {
    const pending = readPendingCheckout();
    if (!pending?.orderId) return;
    let cancelled = false;
    syncPayment(pending.orderId)
      .then((res) => {
        if (cancelled) return;
        const order = res.data;
        if (order.paymentStatus === "CONFIRMED") {
          finishSuccess(order);
        } else if (order.orderStatus === "CREATED" && !order.paymentExpired) {
          setUnpaidOrderId(order.id);
        } else {
          clearPendingCheckout();
        }
      })
      .catch(() => {
        // Recovery is best effort (payments may be unconfigured, or the order gone).
      });
    return () => {
      cancelled = true;
    };
  }, [finishSuccess]);

  // The same cart + address reuses the same Idempotency-Key, so a refresh or a
  // retry finds the order it already created instead of making a second one.
  // Any change to the cart or the address is a different order and gets a new key.
  const idempotencyKeyFor = () => {
    const signature = checkoutSignature(restaurantId, cartItems, address);
    const saved = readPendingCheckout();
    if (saved && saved.signature === signature) {
      return { signature, key: saved.idempotencyKey };
    }
    return { signature, key: crypto.randomUUID() };
  };

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handleOutcome = async (result, order) => {
    switch (result.outcome) {
      case "paid":
        finishSuccess(result.order);
        break;
      case "already-paid":
        try {
          const res = await getOrderById(order.id);
          if (res.data.paymentStatus === "CONFIRMED") {
            finishSuccess(res.data);
            break;
          }
        } catch {
          // fall through to the message below
        }
        setError("This order appears to be paid, but we couldn't load its status. Check My Orders.");
        break;
      case "dismissed":
        if (result.failure) {
          setError(
            `Payment failed${result.failure.description ? `: ${result.failure.description}` : ""}. ` +
              "Your order is saved — you can try again."
          );
        } else {
          setNotice(
            "Payment cancelled. Your order is saved but not paid — choose Razorpay again whenever you're ready."
          );
        }
        break;
      case "unconfirmed":
        setUnconfirmed({ orderId: order.id, paymentId: result.paymentId });
        break;
      default:
        setError(result.message);
        // The order can no longer be paid: the next attempt must start a new one.
        if (result.code === "ORDER_EXPIRED" || result.code === "ORDER_NOT_PAYABLE") {
          clearPendingCheckout();
          setUnpaidOrderId(null);
        }
    }
  };

  // "Proceed to Payment": go to the payment methods screen. Nothing is created yet
  // and Razorpay is not opened — that happens only when Razorpay is chosen there.
  const handleProceed = (e) => {
    e.preventDefault();
    if (busyRef.current || !quote || !addressComplete) return;
    setError("");
    setNotice("");
    setStep("methods");
  };

  // The customer chose Razorpay: place the (unpaid) order, start the Razorpay
  // payment for it and open Razorpay Checkout in TEST MODE. The order only leaves
  // CREATED — and only reaches the restaurant — once the backend has verified the
  // payment.
  const payWithRazorpay = async (method = "razorpay") => {
    if (busyRef.current || !quote || !paymentConfig?.available) return;
    busyRef.current = true;
    setPhase("creating");
    setError("");
    setNotice("");
    setUnconfirmed(null);

    try {
      const { signature, key } = idempotencyKeyFor();

      let order;
      try {
        const res = await createOrder(
          {
            restaurantId,
            items: cartItems.map((item) => ({ foodItemId: item.id, quantity: item.quantity })),
            deliveryAddress: address,
          },
          key
        );
        order = res.data;
      } catch (err) {
        setError(
          err.response?.data?.message ||
            (err.response
              ? "We couldn't place your order. Please check your details and try again."
              : describePaymentError(err).message)
        );
        return;
      }
      savePendingCheckout({ signature, idempotencyKey: key, orderId: order.id });

      if (order.paymentStatus === "CONFIRMED") {
        finishSuccess(order);
        return;
      }

      // The order's own total is what gets charged. If a price changed since the
      // bill on screen was calculated, show the new figures and stop here.
      if (Number(order.finalAmount) !== Number(quote.finalAmount)) {
        setQuote((prev) => ({
          ...prev,
          subtotalAmount: order.subtotalAmount,
          deliveryFee: order.deliveryFee,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          finalAmount: order.finalAmount,
        }));
        setError(
          `The total changed to ${money(order.finalAmount)}. Please review it, then choose Razorpay again.`
        );
        return;
      }

      setUnpaidOrderId(order.id);
      setPhase("paying");
      const result = await payForOrder(order, user, {
        onVerifying: () => setPhase("verifying"),
        method,
      });
      await handleOutcome(result, order);
    } finally {
      busyRef.current = false;
      setPhase("idle");
    }
  };

  const handleCheckStatus = async () => {
    if (busyRef.current || !unconfirmed) return;
    busyRef.current = true;
    setPhase("verifying");
    setError("");
    try {
      const res = await syncPayment(unconfirmed.orderId);
      if (res.data.paymentStatus === "CONFIRMED") {
        finishSuccess(res.data);
        return;
      }
      setError(
        "We still can't see a completed payment for this order. If you were charged, wait a minute and check again."
      );
    } catch (err) {
      setError(describePaymentError(err).message);
    } finally {
      busyRef.current = false;
      setPhase("idle");
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <p className="empty-cart">Your cart is empty.</p>
      </div>
    );
  }

  const billDetails = (
    <>
      {quoteError && (
        <p className="pay-error" role="alert">
          {quoteError} <Link to="/cart">Back to cart</Link>
        </p>
      )}
      {!quote && !quoteError && <p className="co-muted">Calculating your bill…</p>}
      {quote && (
        <div className="pay-bill">
          <div className="co-bill-row">
            <span>Item total</span>
            <span>{money(quote.subtotalAmount)}</span>
          </div>
          <div className="co-bill-row">
            <span>Delivery fee</span>
            <span>{money(quote.deliveryFee)}</span>
          </div>
          <div className="co-bill-row">
            <span>Taxes</span>
            <span>{money(quote.taxAmount)}</span>
          </div>
          <div className={`co-bill-row ${Number(quote.discountAmount) > 0 ? "pay-discount" : ""}`}>
            <span>Discount</span>
            <span>
              {Number(quote.discountAmount) > 0 ? `-${money(quote.discountAmount)}` : money(0)}
            </span>
          </div>
          <div className="co-bill-row pay-total">
            <span>To pay</span>
            <span>{money(quote.finalAmount)}</span>
          </div>
        </div>
      )}
    </>
  );

  // What happened on the last attempt. Shown next to the action that caused it.
  const messages = (
    <>
      {notice && (
        <p className="pay-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="co-error" role="alert">
          {error}
        </p>
      )}
      {unconfirmed && (
        <div className="pay-unconfirmed" role="alert">
          <p>
            <strong>We haven&apos;t confirmed your payment yet.</strong> Razorpay returned payment{" "}
            <code>{unconfirmed.paymentId}</code>, but we couldn&apos;t verify it with our server.
            Your order is not confirmed yet, and you don&apos;t need to pay again.
          </p>
          <button
            type="button"
            className="pay-secondary-btn"
            onClick={handleCheckStatus}
            disabled={busy}
          >
            Check payment status
          </button>
        </div>
      )}
    </>
  );

  if (step === "methods") {
    return (
      <PaymentMethods
        quote={quote}
        cartItems={cartItems}
        razorpayAvailable={Boolean(paymentConfig?.available)}
        razorpayUnavailableReason={paymentConfig?.message}
        retrying={Boolean(unpaidOrderId)}
        phase={phase}
        onPay={payWithRazorpay}
        onBack={() => {
          setError("");
          setNotice("");
          setStep("review");
        }}
      >
        {messages}
      </PaymentMethods>
    );
  }

  return (
    <div className="co-page">
      <h2 className="co-title">Checkout</h2>

      <form className="co-layout" onSubmit={handleProceed}>
        <div className="co-main">
          <section className="co-card">
            <div className="co-card-head">
              <h3>
                {showForm && !addressComplete ? "Add delivery address" : "Delivery address"}
              </h3>
              {!showForm && !loadingAddress && (
                <button type="button" className="co-link-btn" onClick={() => setEditing(true)}>
                  Change
                </button>
              )}
            </div>

            {loadingAddress && <p className="co-muted">Loading your saved address…</p>}

            {!loadingAddress && !showForm && (
              <div className="co-address">
                <span className="co-address-icon" aria-hidden="true">📍</span>
                <div className="co-address-body">
                  <p className="co-address-label">
                    <strong>{address.recipientName}</strong>
                    <span className="co-chip">{address.label || "Home"}</span>
                  </p>
                  <p>{address.phone}</p>
                  <p>
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                  </p>
                  <p>
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  {address.landmark && <p>Landmark: {address.landmark}</p>}
                </div>
              </div>
            )}

            {showForm && (
              <>
                {!addressComplete && (
                  <p className="co-muted">
                    We need a few more details to deliver your order. You won&apos;t have to enter
                    them again.
                  </p>
                )}
                <div className="co-form-grid">
                  <div className="co-field">
                    <label htmlFor="co-recipientName">Recipient name</label>
                    <input
                      id="co-recipientName"
                      type="text"
                      name="recipientName"
                      value={address.recipientName}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-phone">Phone number</label>
                    <input
                      id="co-phone"
                      type="text"
                      name="phone"
                      value={address.phone}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field full">
                    <label htmlFor="co-addressLine1">Address</label>
                    <input
                      id="co-addressLine1"
                      type="text"
                      name="addressLine1"
                      placeholder="House no., street, area"
                      value={address.addressLine1}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field full">
                    <label htmlFor="co-addressLine2">Address line 2 (optional)</label>
                    <input
                      id="co-addressLine2"
                      type="text"
                      name="addressLine2"
                      value={address.addressLine2}
                      onChange={handleAddressChange}
                    />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-city">City</label>
                    <input
                      id="co-city"
                      type="text"
                      name="city"
                      value={address.city}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-state">State</label>
                    <input
                      id="co-state"
                      type="text"
                      name="state"
                      value={address.state}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-pincode">Pincode</label>
                    <input
                      id="co-pincode"
                      type="text"
                      name="pincode"
                      inputMode="numeric"
                      value={address.pincode}
                      onChange={handleAddressChange}
                      required
                    />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-landmark">Landmark (optional)</label>
                    <input
                      id="co-landmark"
                      type="text"
                      name="landmark"
                      value={address.landmark}
                      onChange={handleAddressChange}
                    />
                  </div>
                  <div className="co-label-options">
                    {ADDRESS_LABELS.map((label) => (
                      <button
                        type="button"
                        key={label}
                        className={`co-label-opt ${address.label === label ? "selected" : ""}`}
                        onClick={() => setAddress({ ...address, label })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {addressComplete && (
                  <button
                    type="button"
                    className="co-secondary-btn"
                    onClick={() => setEditing(false)}
                  >
                    Deliver to this address
                  </button>
                )}
              </>
            )}
          </section>

          <section className="co-card">
            <div className="co-card-head">
              <h3>Your items</h3>
              <span className="co-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
            <ul className="co-items">
              {cartItems.map((item) => (
                <li className="co-item" key={item.id}>
                  <img
                    className="co-item-img"
                    src={item.imageUrl || FOOD_PLACEHOLDER}
                    alt={item.itemName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FOOD_PLACEHOLDER;
                    }}
                  />
                  <div className="co-item-info">
                    <p className="co-item-name">
                      <span
                        className={`co-veg ${item.isVeg ? "veg" : "nonveg"}`}
                        role="img"
                        aria-label={item.isVeg ? "Veg" : "Non-veg"}
                      />
                      {item.itemName}
                    </p>
                    <p className="co-item-meta">
                      {money(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="co-item-total">{money(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="co-card co-summary">
          <h3>Bill details</h3>
          {billDetails}

          {paymentConfig && !paymentConfig.available && (
            <p className="pay-warning" role="alert">
              {paymentConfig.message}
            </p>
          )}
          {messages}

          <button
            className="co-place-btn"
            type="submit"
            disabled={busy || loadingAddress || !quote}
          >
            Proceed to Payment
          </button>
          <p className="pay-testnote">
            <span className="pay-testbadge">TEST MODE</span>
            Razorpay test payments only — no real money is charged.
          </p>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
