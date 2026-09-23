import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { cancelOrder, getOrderById } from "../services/orderApi";
import OrderStatusTimeline from "./OrderStatusTimeline";
import "../styles/OrderDetails.css";

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

const OrderDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justPlaced = Boolean(location.state?.justPlaced);

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

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

  return (
    <div className="order-details-page">
      {justPlaced && (
        <div className="order-confirmed-banner">
          <div className="success-tick">✔️</div>
          <h2>Order Confirmed</h2>
          <p>Order #{order.id}</p>
          <p>
            Restaurant: <strong>{order.restaurantName}</strong>
          </p>
        </div>
      )}

      <h2 className="order-title">Order #{order.id}</h2>

      <OrderStatusTimeline status={order.orderStatus} history={order.statusHistory} />

      <div className="order-section">
        <h3>Items</h3>
        {order.items.map((item) => (
          <div className="cart-item-row" key={item.foodItemId}>
            <div className="cart-item-text">
              <h4>{item.itemName}</h4>
              <p>₹ {item.price} × {item.quantity}</p>
            </div>
            <p>₹ {item.subtotal}</p>
          </div>
        ))}
      </div>

      <div className="order-section order-totals">
        <div><span>Subtotal</span><span>₹ {order.subtotalAmount}</span></div>
        <div><span>Delivery Fee</span><span>₹ {order.deliveryFee}</span></div>
        <div><span>Tax</span><span>₹ {order.taxAmount}</span></div>
        {Number(order.discountAmount) > 0 && (
          <div><span>Discount</span><span>-₹ {order.discountAmount}</span></div>
        )}
        <div className="order-total-final"><span>Total</span><span>₹ {order.finalAmount}</span></div>
        <div className="order-payment-status">
          Payment: <strong>{order.paymentStatus}</strong>
        </div>
      </div>

      <div className="order-section">
        <h3>Delivery Address</h3>
        <p>
          {order.deliveryAddress?.recipientName} · {order.deliveryAddress?.phone}
        </p>
        <p>
          {order.deliveryAddress?.addressLine1}
          {order.deliveryAddress?.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ""}
        </p>
        <p>
          {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
        </p>
      </div>

      <div className="order-actions">
        {canCancel && (
          <button className="cancel-order-btn" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
        <button className="checkout-btn" onClick={() => navigate("/orders")}>
          View All Orders
        </button>
        <button className="checkout-btn" onClick={() => navigate("/")}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default OrderDetails;
