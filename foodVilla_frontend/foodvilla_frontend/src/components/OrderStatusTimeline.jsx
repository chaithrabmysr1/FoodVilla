import React from "react";
import "../styles/OrderStatusTimeline.css";

// Mirrors the forward path enforced by order-service's
// OrderStatusTransitionValidator (see foodVilla_backend/order-service).
const STEPS = [
  { status: "CREATED", label: "Order placed" },
  { status: "RESTAURANT_PENDING", label: "Restaurant received order" },
  { status: "RESTAURANT_ACCEPTED", label: "Restaurant accepted" },
  { status: "PREPARING", label: "Preparing your food" },
  { status: "READY_FOR_PICKUP", label: "Food ready" },
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
  // PAYMENT_FAILED can only appear on orders created before payment-service
  // was removed; the banner is kept so those orders still render correctly.
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

  // Orders that predate the payment/delivery-service removal can still sit in a
  // status that is no longer a step (e.g. PAYMENT_CONFIRMED); fall back to the
  // last step they actually reached so the timeline isn't blank.
  let currentIndex = STEPS.findIndex((s) => s.status === status);
  if (currentIndex < 0) {
    const reached = lastNonTerminalStatus(history);
    currentIndex = STEPS.findIndex((s) => s.status === reached);
  }

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
