import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyOrders } from "../services/orderApi";
import "../styles/OrderDetails.css";

const OrderHistory = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyOrders(page, 10)
      .then((res) => setPageData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading && !pageData) {
    return (
      <div className="order-details-page">
        <p>Loading your orders...</p>
      </div>
    );
  }

  const orders = pageData?.content || [];

  if (orders.length === 0) {
    return (
      <div className="order-details-page">
        <p className="empty-cart">No previous orders yet.</p>
        <button className="checkout-btn" onClick={() => navigate("/")}>
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      <h2 className="order-title">My Orders</h2>

      <div className="order-history-list">
        {orders.map((order) => (
          <div
            className="order-history-card"
            key={order.id}
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <div>
              <h4>{order.restaurantName}</h4>
              <p>Order #{order.id} · {new Date(order.createdAt).toLocaleString()}</p>
              <p>{order.items.length} item{order.items.length > 1 ? "s" : ""}</p>
            </div>
            <div className="order-history-meta">
              <span className={`status-badge status-${order.orderStatus.toLowerCase()}`}>
                {order.orderStatus.replaceAll("_", " ")}
              </span>
              <strong>₹ {order.finalAmount}</strong>
            </div>
          </div>
        ))}
      </div>

      {pageData && pageData.totalPages > 1 && (
        <div className="order-pagination">
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
