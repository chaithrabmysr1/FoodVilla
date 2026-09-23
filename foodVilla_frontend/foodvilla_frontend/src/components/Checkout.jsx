import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { createOrder } from "../services/orderApi";
import "../styles/Cart.css";

const celebrate = () => {
  const duration = 2 * 1000;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 } });
    confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cartItems] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  // Generated once per checkout attempt — retried submissions (e.g. after a
  // transient network error) reuse the same key so order-service treats them
  // as the same order instead of creating a duplicate.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [address, setAddress] = useState({
    recipientName: user?.fullName || "",
    phone: user?.phoneNumber || "",
    addressLine1: user?.address || "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    label: "Home",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const restaurantId = cartItems[0]?.restaurantId;

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const orderRequest = {
        restaurantId,
        items: cartItems.map((item) => ({
          foodItemId: item.id,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
      };

      const res = await createOrder(orderRequest, idempotencyKey);
      const order = res.data;

      // Demo deployment: no payment-service in this build. Order placement
      // itself is the completed step here — no payment is initiated or
      // confirmed. A failed request leaves the cart untouched so the user
      // can retry.
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      celebrate();

      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "We couldn't place your order. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <p className="empty-cart">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="cart-page checkout-page">
      <h2>Checkout</h2>

      <div className="cart-items">
        <h3>Order Summary</h3>
        {cartItems.map((item) => (
          <div className="cart-item-row" key={item.id}>
            <img src={item.imageUrl || "/default-food.png"} alt={item.itemName} />
            <div className="cart-item-text">
              <h4>{item.itemName}</h4>
              <p>₹ {item.price}</p>
              <p>Quantity: {item.quantity}</p>
              <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</p>
            </div>
          </div>
        ))}
      </div>

      <form className="user-details" onSubmit={handlePlaceOrder}>
        <h3>Delivery Address</h3>
        <input
          type="text"
          name="recipientName"
          placeholder="Recipient name"
          value={address.recipientName}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone number"
          value={address.phone}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="addressLine1"
          placeholder="Address line 1"
          value={address.addressLine1}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="addressLine2"
          placeholder="Address line 2 (optional)"
          value={address.addressLine2}
          onChange={handleAddressChange}
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={address.city}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="state"
          placeholder="State"
          value={address.state}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="pincode"
          placeholder="Pincode"
          value={address.pincode}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="landmark"
          placeholder="Landmark (optional)"
          value={address.landmark}
          onChange={handleAddressChange}
        />

        {error && <p className="auth-message">{error}</p>}

        <p className="checkout-demo-note">
          Demo checkout — order placement is simulated; no real payment is processed.
        </p>

        <div className="cart-footer">
          <h3>Total: ₹ {totalPrice}</h3>
          <button className="checkout-btn" type="submit" disabled={submitting}>
            {submitting ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
