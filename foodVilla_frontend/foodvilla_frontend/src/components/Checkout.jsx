import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import "../styles/Cart.css";

const Checkout = () => {
  const [orderItems, setOrderItems] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Load last order from localStorage
    const lastOrder = JSON.parse(localStorage.getItem("lastOrder")) || [];
    setOrderItems(lastOrder);

    // ✅ Load user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem("user"));
    setUser(userInfo);

    // ✅ Clear cart and update header badge
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));

    // 🎉 Trigger confetti animation
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const totalPrice = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleBackHome = () => {
    navigate("/");
  };

  if (orderItems.length === 0)
    return <p className="empty-cart">No recent order found.</p>;

  return (
    <div className="cart-page checkout-page">
      {/* ✅ Success Message */}
      <div className="checkout-header">
        <div className="success-tick">✔️</div>
        <h2>Order Placed Successfully!</h2>
        <p>Your delicious food is being prepared 🍴</p>
      </div>

      {/* ✅ User Info Section */}
      {user && (
        <div className="user-details">
          <h3>Delivery Details</h3>
          <p><strong>Name:</strong> {user.fullName}</p>
          <p><strong>Phone:</strong> {user.phoneNumber}</p>
          <p><strong>Address:</strong> {user.address}</p>
        </div>
      )}

      {/* ✅ Ordered Items */}
      <div className="cart-items">
        <h3>Order Summary</h3>
        {orderItems.map((item) => (
          <div className="cart-item-row" key={item.id}>
            <img
              src={item.imageUrl || "/default-food.png"}
              alt={item.itemName}
            />
            <div className="cart-item-text">
              <h4>{item.itemName}</h4>
              <p>₹ {item.price}</p>
              <p>Quantity: {item.quantity}</p>
              <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Footer Section */}
      <div className="cart-footer">
        <h3>Total Paid: ₹ {totalPrice}</h3>
        <p>Payment Method: <strong>Online Payment (Simulated)</strong></p>
        <button className="checkout-btn" onClick={handleBackHome}>
          Back to Home
          </button>
      </div>
    </div>
  );
};

export default Checkout;
