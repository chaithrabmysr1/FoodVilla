import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderById, updateOrderStatus } from "../../services/orderApi";
import { acceptOrder, markPreparing, markReady, rejectOrder } from "../../services/restaurantOrderApi";
import OrderStatusTimeline from "../OrderStatusTimeline";
import "../../styles/Admin.css";
import "../../styles/OrderDetails.css";

// Statuses an order can still be moved into. The backend is authoritative and
// only accepts transitions valid from the current status.
const ALL_STATUSES = [
  "RESTAURANT_PENDING", "RESTAURANT_ACCEPTED", "PREPARING", "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
];

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [forceStatus, setForceStatus] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getOrderById(id)
      .then((res) => setOrder(res.data))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load order"));
  }, [id]);

  useEffect(load, [load]);

  const runAction = async (fn) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      // Restaurant actions publish a Kafka event and apply asynchronously —
      // give the consumer a moment, then refresh.
      setTimeout(load, 1200);
    } catch (err) {
      setMessage(err.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (message && !order) {
    return <div className="order-details-page"><p className="admin-empty">{message}</p></div>;
  }
  if (!order) {
    return <div className="order-details-page"><p>Loading...</p></div>;
  }

  return (
    <div className="order-details-page">
      <div className="admin-page-header">
        <h2 className="order-title">Order #{order.id}</h2>
        <button className="admin-btn secondary" onClick={() => navigate("/admin/orders")}>
          Back to orders
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <OrderStatusTimeline status={order.orderStatus} history={order.statusHistory} />

      <div className="order-section">
        <h3>Customer & Restaurant</h3>
        <p>Customer: {order.customerEmail}</p>
        <p>Restaurant: {order.restaurantName} (ID {order.restaurantId})</p>
        <p>Total: ₹{order.finalAmount}</p>
      </div>

      <div className="order-section">
        <h3>Items</h3>
        {order.items.map((item) => (
          <p key={item.foodItemId}>
            {item.itemName} × {item.quantity} — ₹{item.subtotal}
          </p>
        ))}
      </div>

      <div className="admin-card">
        <h3>Restaurant actions</h3>
        {order.orderStatus === "RESTAURANT_PENDING" && (
          <>
            <button className="admin-btn" disabled={busy} onClick={() => runAction(() => acceptOrder(order.restaurantId, order.id))}>
              Accept order
            </button>{" "}
            <button className="admin-btn danger" disabled={busy} onClick={() => runAction(() => rejectOrder(order.restaurantId, order.id, "Rejected by admin"))}>
              Reject order
            </button>
          </>
        )}
        {order.orderStatus === "RESTAURANT_ACCEPTED" && (
          <button className="admin-btn" disabled={busy} onClick={() => runAction(() => markPreparing(order.restaurantId, order.id))}>
            Start preparing
          </button>
        )}
        {order.orderStatus === "PREPARING" && (
          <button className="admin-btn" disabled={busy} onClick={() => runAction(() => markReady(order.restaurantId, order.id))}>
            Mark ready for pickup
          </button>
        )}
        {!["RESTAURANT_PENDING", "RESTAURANT_ACCEPTED", "PREPARING"].includes(order.orderStatus) && (
          <p style={{ color: "#777", fontSize: "0.85rem" }}>No restaurant action available at this stage.</p>
        )}
      </div>

      <div className="admin-card">
        <h3>Delivery</h3>
        {order.orderStatus === "READY_FOR_PICKUP" && (
          <button
            className="admin-btn"
            disabled={busy}
            onClick={() => runAction(() => updateOrderStatus(order.id, "OUT_FOR_DELIVERY", "Marked out for delivery by admin"))}
          >
            Mark out for delivery
          </button>
        )}
        {order.orderStatus === "OUT_FOR_DELIVERY" && (
          <button
            className="admin-btn"
            disabled={busy}
            onClick={() => runAction(() => updateOrderStatus(order.id, "DELIVERED", "Marked delivered by admin"))}
          >
            Mark delivered
          </button>
        )}
        {!["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(order.orderStatus) && (
          <p style={{ color: "#777", fontSize: "0.85rem" }}>No delivery action available at this stage.</p>
        )}
      </div>

      <div className="admin-card">
        <h3>Force status (override)</h3>
        <p style={{ color: "#777", fontSize: "0.85rem" }}>
          Bypasses the normal restaurant flow — only valid transitions from the
          current status are accepted by the backend.
        </p>
        <select value={forceStatus} onChange={(e) => setForceStatus(e.target.value)}>
          <option value="">Select target status...</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>{" "}
        <button
          className="admin-btn secondary"
          disabled={busy || !forceStatus}
          onClick={() =>
            runAction(async () => {
              await updateOrderStatus(order.id, forceStatus, "Manual admin override");
              setForceStatus("");
            })
          }
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
