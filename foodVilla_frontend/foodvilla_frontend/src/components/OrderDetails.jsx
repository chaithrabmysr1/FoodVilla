import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { cancelOrder, getOrderById } from "../services/orderApi";
import { money } from "../utils/format";
import { SUCCESS_PAUSE_MS, payForOrder, sleep } from "../utils/paymentFlow";
import { orderHeadline, paymentInfo, paymentMethodLabel } from "../utils/paymentInfo";
import OrderStatusTimeline from "./OrderStatusTimeline";
import PaymentMethods from "./PaymentMethods";
import "../styles/OrderDetails.css";
import "../styles/OrderConfirmation.css";
import "../styles/Payment.css";

// Mirrors OrderStatusTransitionValidator's CANCELLED-reachable set on the
// backend (order-service) — the backend is authoritative; this only decides
// whether to show the button at all.
const CANCELLABLE_STATUSES = new Set([
  "CREATED",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "RESTAURANT_PENDING",
  "RESTAURANT_ACCEPTED",
]);

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED", "PAYMENT_FAILED"]);

const POLL_INTERVAL_MS = 8000;

const STATUS_LABELS = {
  CREATED: "Order placed",
  RESTAURANT_PENDING: "Sent to restaurant",
  RESTAURANT_ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Food ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const statusLabel = (status) =>
  STATUS_LABELS[status] ||
  status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const statusTone = (status) => {
  if (status === "DELIVERED") return "done";
  if (status === "CANCELLED" || status === "PAYMENT_FAILED") return "failed";
  return "active";
};

const OrderDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justPlaced = Boolean(location.state?.justPlaced);

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  // Paying an unpaid order from this page: the payment-method screen is shown
  // (payStep) and the payment goes idle -> processing -> success -> idle.
  const [payStep, setPayStep] = useState(false);
  const [payPhase, setPayPhase] = useState("idle");
  const [payError, setPayError] = useState("");
  const [justPaid, setJustPaid] = useState(false);
  const busyRef = useRef(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await getOrderById(id);
      setOrder(res.data);
      setError("");
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Order not found.");
      } else if (err.response?.status === 403) {
        setError("You don't have access to this order.");
      } else {
        setError("Couldn't load this order right now.");
      }
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Clean polling fallback until real-time (WebSocket/SSE) status push
  // exists — stops once the order reaches a terminal status.
  useEffect(() => {
    if (!order || TERMINAL_STATUSES.has(order.orderStatus)) return;
    const interval = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const handlePay = async (payment) => {
    if (busyRef.current || !order) return;
    busyRef.current = true;
    setPayPhase("processing");
    setPayError("");
    try {
      const result = await payForOrder(order, payment);
      if (result.outcome === "paid") {
        setPayPhase("success");
        await sleep(SUCCESS_PAUSE_MS);
        setOrder(result.order);
        setJustPaid(true);
        setPayStep(false);
      } else if (result.outcome === "already-paid") {
        // The backend says it is paid — load it so the page shows the real state.
        await fetchOrder();
        setJustPaid(true);
        setPayStep(false);
      } else {
        setPayError(result.message);
        await fetchOrder(); // e.g. it expired or was cancelled meanwhile
      }
    } finally {
      busyRef.current = false;
      setPayPhase("idle");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(id);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  if (error) {
    return (
      <div className="order-details-page">
        <p className="empty-cart">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-page">
        <p>Loading order...</p>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.has(order.orderStatus);
  const address = order.deliveryAddress;

  const payment = paymentInfo(order);
  const method = paymentMethodLabel(order);
  const headline = orderHeadline(order, statusLabel);
  // An unpaid CREATED order has not been placed with the restaurant yet.
  const unpaidHold = order.orderStatus === "CREATED" && payment.key !== "paid";
  const tone = unpaidHold ? payment.tone : statusTone(order.orderStatus);
  // "Payment successful" is shown ONLY when the backend says the order is paid —
  // never from navigation state alone.
  const showHero = (justPlaced || justPaid) && order.paymentStatus === "CONFIRMED";

  // Paying an unpaid order: the same payment-method screen as checkout. It only
  // shows while the order can still be paid (it may expire or be cancelled).
  if (payStep && payment.awaiting) {
    return (
      <PaymentMethods
        quote={order}
        cartItems={order.items.map((item) => ({
          id: item.foodItemId,
          itemName: item.itemName,
          price: item.price,
          quantity: item.quantity,
        }))}
        retrying={false}
        phase={payPhase}
        error={payError}
        onPay={handlePay}
        onBack={() => {
          setPayError("");
          setPayStep(false);
        }}
      />
    );
  }

  return (
    <div className="oc-page">
      {showHero ? (
        <section className="oc-hero">
          <div className="oc-check" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle className="oc-check-circle" cx="26" cy="26" r="24" />
              <path className="oc-check-mark" d="M15 27l8 8 15-17" />
            </svg>
          </div>
          <h2>Thank you for your order!</h2>
          <ul className="pay-checks">
            <li>
              <FaCheckCircle aria-hidden="true" />
              <span>
                <strong>Payment Successful</strong>
                <small>{method ? `Paid with ${method}` : "Your payment was received"}</small>
              </span>
            </li>
            <li>
              <FaCheckCircle aria-hidden="true" />
              <span>
                <strong>Order Confirmed</strong>
                <small>Order #{order.id} has been sent to {order.restaurantName}</small>
              </span>
            </li>
          </ul>
          <dl className="pay-facts">
            <div>
              <dt>Order ID</dt>
              <dd>#{order.id}</dd>
            </div>
            <div>
              <dt>Transaction ID</dt>
              <dd className="pay-mono">{order.paymentId}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(order.finalAmount)}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>
                <span className="pay-status-chip">PAID</span>
              </dd>
            </div>
            <div>
              <dt>Restaurant</dt>
              <dd>{order.restaurantName}</dd>
            </div>
            <div>
              <dt>Order status</dt>
              <dd>{headline}</dd>
            </div>
            <div className="wide">
              <dt>Your order</dt>
              <dd>{order.items.map((item) => `${item.itemName} × ${item.quantity}`).join(", ")}</dd>
            </div>
          </dl>
          <div className="pay-hero-actions">
            <button className="oc-btn primary" onClick={() => navigate("/orders")}>
              View My Orders
            </button>
            <button className="oc-btn secondary" onClick={() => navigate("/")}>
              Continue Shopping
            </button>
          </div>
        </section>
      ) : (
        <header className="oc-header">
          <div>
            <h2>Order #{order.id}</h2>
            <p>{order.restaurantName}</p>
          </div>
          <span className={`oc-status ${tone}`}>{headline}</span>
        </header>
      )}

      <div className="oc-layout">
        <div className="oc-col">
          <section className="oc-card">
            <div className="oc-card-head">
              <h3>Order status</h3>
              {showHero && <span className={`oc-status ${tone}`}>{headline}</span>}
            </div>
            {unpaidHold ? (
              <p className="pay-hold">
                {payment.expired
                  ? "This order wasn't paid in time, so it was never sent to the restaurant."
                  : `Your order will be sent to ${order.restaurantName} as soon as your payment is confirmed.`}
              </p>
            ) : (
              <OrderStatusTimeline status={order.orderStatus} history={order.statusHistory} />
            )}
          </section>

          <section className="oc-card">
            <div className="oc-card-head">
              <h3>Payment</h3>
              <span
                className={`oc-status ${
                  payment.tone === "muted" ? "pay-muted-chip" : payment.tone === "active" ? "" : payment.tone
                }`}
              >
                {payment.label}
              </span>
            </div>
            <dl className="pay-rows">
              <div>
                <dt>{payment.key === "paid" ? "Amount paid" : "Amount due"}</dt>
                <dd>{money(order.finalAmount)}</dd>
              </div>
              {method && (
                <div>
                  <dt>Method</dt>
                  <dd>{method}</dd>
                </div>
              )}
              {order.paymentId && (
                <div>
                  <dt>Transaction ID</dt>
                  <dd className="pay-mono">{order.paymentId}</dd>
                </div>
              )}
            </dl>

            {payment.key === "failed" && order.paymentFailureReason && (
              <p className="pay-muted-text">Last attempt: {order.paymentFailureReason}</p>
            )}
            {payment.key === "none" && (
              <p className="pay-muted-text">
                This order was placed before online payments were available, so nothing was
                collected online for it.
              </p>
            )}
            {payment.expired && (
              <p className="pay-muted-text">
                Unpaid orders can only be paid for a short time after they are placed. You can cancel
                this one and place a new order.
              </p>
            )}

            {payment.awaiting && (
              <div className="pay-panel">
                {payError && (
                  <p className="pay-error" role="alert">
                    {payError}
                  </p>
                )}
                <button
                  className="oc-btn primary"
                  onClick={() => {
                    setPayError("");
                    setPayStep(true);
                  }}
                >
                  {payment.key === "failed" ? "Retry Payment" : "Pay Now"}
                </button>
              </div>
            )}
          </section>

          <section className="oc-card">
            <div className="oc-card-head">
              <h3>Items</h3>
            </div>
            <ul className="oc-items">
              {order.items.map((item) => (
                <li className="oc-item" key={item.foodItemId}>
                  <div className="oc-item-text">
                    <p className="oc-item-name">{item.itemName}</p>
                    <p className="oc-item-meta">
                      {money(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="oc-item-total">{money(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="oc-card">
            <div className="oc-card-head">
              <h3>Delivering to</h3>
            </div>
            <div className="oc-address">
              <span className="oc-address-icon" aria-hidden="true">📍</span>
              <div>
                <p className="oc-address-name">
                  {address?.recipientName}
                  {address?.label && <span className="oc-chip">{address.label}</span>}
                </p>
                <p>{address?.phone}</p>
                <p>
                  {address?.addressLine1}
                  {address?.addressLine2 ? `, ${address.addressLine2}` : ""}
                </p>
                <p>
                  {address?.city}, {address?.state} - {address?.pincode}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="oc-col">
          <section className="oc-card">
            <div className="oc-card-head">
              <h3>Bill details</h3>
            </div>
            <div className="oc-bill">
              <div><span>Item total</span><span>{money(order.subtotalAmount)}</span></div>
              <div><span>Delivery fee</span><span>{money(order.deliveryFee)}</span></div>
              <div><span>Taxes</span><span>{money(order.taxAmount)}</span></div>
              {Number(order.discountAmount) > 0 && (
                <div className="oc-bill-discount">
                  <span>Discount</span>
                  <span>-{money(order.discountAmount)}</span>
                </div>
              )}
              <div className="oc-bill-total">
                <span>Total</span>
                <span>{money(order.finalAmount)}</span>
              </div>
            </div>
          </section>

          <div className="oc-actions">
            {!showHero && (
              <>
                <button className="oc-btn primary" onClick={() => navigate("/")}>
                  Continue Shopping
                </button>
                <button className="oc-btn secondary" onClick={() => navigate("/orders")}>
                  View All Orders
                </button>
              </>
            )}
            {canCancel && (
              <button className="oc-btn danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetails;
