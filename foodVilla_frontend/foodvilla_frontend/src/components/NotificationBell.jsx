import React, { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/apiClient";
import { listNotifications, markAllRead, markRead } from "../services/notificationApi";
import "../styles/NotificationBell.css";

const NotificationBell = () => {
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifications([]);
      return;
    }

    listNotifications(0, 20)
      .then((res) => setNotifications(res.data.content || []))
      .catch((err) => console.error(err));

    // EventSource can't set an Authorization header, so the token travels
    // as a query param here — see notification-service's JwtFilter.
    const es = new EventSource(
      `${API_BASE_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`
    );
    es.addEventListener("notification", (event) => {
      try {
        const notification = JSON.parse(event.data);
        setNotifications((prev) => [notification, ...prev]);
      } catch (err) {
        console.error("Malformed notification payload", err);
      }
    });
    es.onerror = () => {
      // Let the browser's built-in EventSource auto-reconnect handle
      // transient drops rather than tearing anything down here.
    };
    eventSourceRef.current = es;

    return () => es.close();
  }, [isAuthenticated, token]);

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (id) => {
    markRead(id)
      .then(() => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      })
      .catch((err) => console.error(err));
  };

  const handleMarkAllRead = () => {
    markAllRead()
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))))
      .catch((err) => console.error(err));
  };

  return (
    <div className="notification-bell">
      <div className="menu-item" onClick={() => setOpen((o) => !o)}>
        <FaBell className="icon" />
        {unreadCount > 0 && <span className="cart-badge">{unreadCount}</span>}
        <span>Alerts</span>
      </div>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="notification-empty">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-item ${n.read ? "" : "unread"}`}
                onClick={() => handleMarkRead(n.id)}
              >
                <strong>{n.title}</strong>
                <p>{n.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
