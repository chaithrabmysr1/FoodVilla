import React from "react";
import "../styles/OrderStatusTimeline.css";

// Mirrors the forward path enforced by order-service's
// OrderStatusTransitionValidator (see foodVilla_backend/order-service).
const STEPS = [
  { status: "CREATED", label: "Order placed" },
  { status: "PAYMENT_PENDING", label: "Payment pending" },
  { status: "PAYMENT_CONFIRMED", label: "Payment confirmed" },
  { status: "RESTAURANT_PENDING", label: "Restaurant received order" },
  { status: "RESTAURANT_ACCEPTED", label: "Restaurant accepted" },
  { status: "PREPARING", label: "Preparing your food" },
  { status: "READY_FOR_PICKUP", label: "Food ready" },
  { status: "DELIVERY_PARTNER_ASSIGNED", label: "Delivery partner assigned" },
  { status: "PICKED_UP", label: "Order picked up" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

function lastNonTerminalStatus(history) {
  if (!history || history.length === 0) return null;
  const forwardStatuses = new Set(STEPS.map((s) => s.status));
  const reached = history
    .map((h) => h.status)
    .filter((s) => forwardStatuses.has(s));
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

const OrderStatusTimeline = ({ status, history = [] }) => {
  if (status === "CANCELLED" || status === "PAYMENT_FAILED") {
    const reachedBefore = lastNonTerminalStatus(history);
    return (
      <div className="order-timeline order-timeline-terminal">
        <div className={`terminal-banner ${status === "CANCELLED" ? "cancelled" : "payment-failed"}`}>
          {status === "CANCELLED" ? "❌ Order Cancelled" : "⚠️ Payment Failed"}
        </div>
        {reachedBefore && (
          <p className="terminal-context">
            Last reached stage: {STEPS.find((s) => s.status === reachedBefore)?.label}
          </p>
        )}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="order-timeline">
      {STEPS.map((step, index) => {
        let stateClass = "upcoming";
        let icon = "○";
        if (currentIndex >= 0 && index < currentIndex) {
          stateClass = "completed";
          icon = "✓";
        } else if (index === currentIndex) {
          stateClass = "current";
          icon = "●";
        }
        return (
          <div className={`timeline-step ${stateClass}`} key={step.status}>
            <span className="timeline-icon">{icon}</span>
            <span className="timeline-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatusTimeline;
