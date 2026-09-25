import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyOrders } from "../services/orderApi";
import { getAllFoodItems } from "../services/catalogueApi";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import { orderHeadline, paymentInfo, paymentMethodLabel } from "../utils/paymentInfo";
import "../styles/OrderHistory.css";
import "../styles/Payment.css";

// Same wording as the order details page, so the list and the page you land
// on agree.
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

const OrderHistory = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  // foodItemId -> image URL. Orders only store name/price/quantity, so the
  // pictures come from the public catalogue.
  const [imageById, setImageById] = useState({});

  useEffect(() => {
    setLoading(true);
    getMyOrders(page, 10)
      .then((res) => setPageData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    getAllFoodItems()
      .then((res) => {
        if (cancelled) return;
        const images = {};
        (res.data || []).forEach((food) => {
          if (food.imageUrl) images[food.id] = food.imageUrl;
        });
        setImageById(images);
      })
      .catch(() => {
        // Pictures are decorative — the list works fine with placeholders.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !pageData) {
    return (
      <div className="oh-page">
        <p className="oh-loading">Loading your orders...</p>
      </div>
    );
  }

  const orders = pageData?.content || [];

  if (orders.length === 0) {
    return (
      <div className="oh-page">
        <div className="oh-empty">
          <div className="oh-empty-icon" aria-hidden="true">🧾</div>
          <h2>No orders yet</h2>
          <p>Once you place an order it will show up here.</p>
          <button className="oh-btn" onClick={() => navigate("/")}>
            Browse restaurants
          </button>
        </div>
      </div>
    );
  }

  const totalOrders = pageData?.totalElements ?? orders.length;

  return (
    <div className="oh-page">
      <h2 className="oh-title">
        My Orders
        <span className="oh-count">
          {totalOrders} {totalOrders === 1 ? "order" : "orders"}
        </span>
      </h2>

      <ul className="oh-list">
        {orders.map((order) => {
          const firstItem = order.items[0];
          const extraItems = order.items.length - 1;
          const payment = paymentInfo(order);
          const method = paymentMethodLabel(order);
          // An unpaid CREATED order has not been placed with the restaurant, so
          // it reads "Awaiting payment", not "Order placed".
          const unpaidHold = order.orderStatus === "CREATED" && payment.key !== "paid";
          return (
            <li key={order.id}>
              <Link className="oh-card" to={`/orders/${order.id}`}>
                <div className="oh-thumb">
                  <img
                    src={imageById[firstItem?.foodItemId] || FOOD_PLACEHOLDER}
                    alt={firstItem?.itemName || "Food"}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FOOD_PLACEHOLDER;
                    }}
                  />
                  {extraItems > 0 && <span className="oh-thumb-more">+{extraItems}</span>}
                </div>

                <div className="oh-main">
                  <h3 className="oh-restaurant">{order.restaurantName}</h3>
                  <p className="oh-items">
                    {order.items.map((item) => `${item.itemName} × ${item.quantity}`).join(", ")}
                  </p>
                  <p className="oh-meta">
                    Order #{order.id} ·{" "}
                    {new Date(order.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className={`pay-line ${payment.key}`}>
                    Payment: <strong>{payment.label}</strong>
                    {method && ` · ${method}`}
                    {order.paymentId && (
                      <>
                        {" "}
                        · <span className="pay-mono">{order.paymentId}</span>
                      </>
                    )}
                    {payment.awaiting && " · open the order to pay"}
                  </p>
                </div>

                <div className="oh-side">
                  <span
                    className={`oh-status ${unpaidHold ? payment.tone : statusTone(order.orderStatus)}`}
                  >
                    {orderHeadline(order, statusLabel)}
                  </span>
                  <strong className="oh-total">{money(order.finalAmount)}</strong>
                  <span className="oh-view">View details ›</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {pageData && pageData.totalPages > 1 && (
        <div className="oh-pagination">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {pageData.totalPages}
          </span>
          <button
            disabled={page + 1 >= pageData.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
