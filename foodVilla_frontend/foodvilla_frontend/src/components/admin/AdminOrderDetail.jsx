import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderById, updateOrderStatus } from "../../services/orderApi";
import { acceptOrder, markPreparing, markReady, rejectOrder } from "../../services/restaurantOrderApi";
import {
  assignDelivery,
  getAssignmentForOrder,
  listDeliveryPartners,
  markDelivered,
  markOutForDelivery,
  markPickedUp,
} from "../../services/deliveryApi";
import OrderStatusTimeline from "../OrderStatusTimeline";
import "../../styles/Admin.css";
import "../../styles/OrderDetails.css";

const ALL_STATUSES = [
  "CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "RESTAURANT_PENDING",
  "RESTAURANT_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "DELIVERY_PARTNER_ASSIGNED",
  "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PAYMENT_FAILED",
];

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [forceStatus, setForceStatus] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getOrderById(id)
      .then((res) => setOrder(res.data))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load order"));
    getAssignmentForOrder(id)
      .then((res) => setAssignment(res.data))
      .catch(() => setAssignment(null));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (order?.orderStatus === "READY_FOR_PICKUP") {
      listDeliveryPartners(true)
        .then((res) => setPartners(res.data || []))
        .catch(() => {});
    }
  }, [order?.orderStatus]);

  const runAction = async (fn) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      // Restaurant/delivery actions publish a Kafka event and apply
      // asynchronously — give the consumer a moment, then refresh.
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
        <p>Payment: {order.paymentStatus} · Total: ₹{order.finalAmount}</p>
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
        {assignment && (
          <p>
            Assigned to partner #{assignment.deliveryPartnerId} — status: {assignment.status}
          </p>
        )}

        {order.orderStatus === "READY_FOR_PICKUP" && !assignment && (
          <>
            <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)}>
              <option value="">Select a delivery partner...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.vehicleType || "vehicle n/a"})
                </option>
              ))}
            </select>{" "}
            <button
              className="admin-btn"
              disabled={busy || !selectedPartner}
              onClick={() => runAction(() => assignDelivery(order.id, order.restaurantId, Number(selectedPartner)))}
            >
              Assign delivery partner
            </button>
          </>
        )}

        {assignment?.status === "ASSIGNED" || assignment?.status === "ACCEPTED" ? (
          <button className="admin-btn" disabled={busy} onClick={() => runAction(() => markPickedUp(assignment.id))}>
            Mark picked up
          </button>
        ) : null}
        {assignment?.status === "PICKED_UP" && (
          <button className="admin-btn" disabled={busy} onClick={() => runAction(() => markOutForDelivery(assignment.id))}>
            Mark out for delivery
          </button>
        )}
        {assignment?.status === "OUT_FOR_DELIVERY" && (
          <button className="admin-btn" disabled={busy} onClick={() => runAction(() => markDelivered(assignment.id))}>
            Mark delivered
          </button>
        )}
      </div>

      <div className="admin-card">
        <h3>Force status (override)</h3>
        <p style={{ color: "#777", fontSize: "0.85rem" }}>
          Bypasses the normal restaurant/delivery flow — only valid transitions from the
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
