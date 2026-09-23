import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllOrdersAdmin } from "../../services/orderApi";
import "../../styles/Admin.css";

const STATUSES = [
  "CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "RESTAURANT_PENDING",
  "RESTAURANT_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "DELIVERY_PARTNER_ASSIGNED",
  "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PAYMENT_FAILED",
];

const AdminOrders = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAllOrdersAdmin(status, page, 15)
      .then((res) => setPageData(res.data))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load orders"));
  }, [status, page]);

  const orders = pageData?.content || [];

  return (
    <div>
      <div className="admin-page-header">
        <h2>Orders</h2>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-filter-bar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="admin-empty">No orders found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} style={{ cursor: "pointer" }}>
                <td>#{o.id}</td>
                <td>{o.customerEmail}</td>
                <td>{o.restaurantName}</td>
                <td>{o.orderStatus.replaceAll("_", " ")}</td>
                <td>{o.paymentStatus}</td>
                <td>₹{o.finalAmount}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>
                  <button className="admin-btn secondary" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pageData && pageData.totalPages > 1 && (
        <div className="admin-filter-bar" style={{ marginTop: 14 }}>
          <button className="admin-btn secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span style={{ alignSelf: "center" }}>
            Page {page + 1} of {pageData.totalPages}
          </span>
          <button
            className="admin-btn secondary"
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

export default AdminOrders;
