import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import "../styles/Cart.css";
import "../styles/CartPage.css";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  // ✅ Load cart from localStorage
  const fetchCart = () => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
  };

  useEffect(() => {
    fetchCart();
    const handleCartUpdate = () => fetchCart();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // ✅ Update cart storage with merge
  const updateCartStorage = (updatedItems) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const mergedCart = [...existingCart];

    updatedItems.forEach((newItem) => {
      const index = mergedCart.findIndex((i) => i.id === newItem.id);
      if (index !== -1) {
        mergedCart[index].quantity = newItem.quantity;
      } else {
        mergedCart.push(newItem);
      }
    });

    localStorage.setItem("cart", JSON.stringify(mergedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleAdd = (itemId) => {
    const updated = cartItems.map((i) =>
      i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
    );
    setCartItems(updated);
    updateCartStorage(updated);
  };

  const handleRemove = (itemId) => {
    const updated = cartItems
      .map((i) =>
        i.id === itemId && i.quantity > 1
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
      .filter((i) => i.quantity > 0);
    setCartItems(updated);
    updateCartStorage(updated);
  };

  const handleDelete = (itemId) => {
    const updated = cartItems.filter((i) => i.id !== itemId);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleCheckout = () => {
    // Cart stays intact until an order is actually created on the backend —
    // Checkout reads directly from localStorage["cart"] and only clears it
    // on a confirmed order, so a failed/declined request doesn't lose items.
    navigate("/checkout");
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div className="ct-page">
        <div className="ct-empty">
          <div className="ct-empty-icon" aria-hidden="true">🛒</div>
          <h2>Your cart is empty</h2>
          <p>You haven&apos;t added anything yet. Pick something tasty from a restaurant.</p>
          <button className="ct-btn primary" onClick={() => navigate("/")}>
            Browse restaurants
          </button>
        </div>
      </div>
    );
  }

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const restaurantId = cartItems[0]?.restaurantId;

  return (
    <div className="ct-page">
      <h2 className="ct-title">
        Your Cart
        <span className="ct-count">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </h2>

      <div className="ct-layout">
        <section className="ct-card">
          <ul className="ct-items">
            {cartItems.map((item) => (
              <li className="ct-item" key={item.id}>
                <img
                  className="ct-item-img"
                  src={item.imageUrl || FOOD_PLACEHOLDER}
                  alt={item.itemName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FOOD_PLACEHOLDER;
                  }}
                />
                <div className="ct-item-info">
                  <p className="ct-item-name">
                    <span
                      className={`ct-veg ${item.isVeg ? "veg" : "nonveg"}`}
                      role="img"
                      aria-label={item.isVeg ? "Veg" : "Non-veg"}
                    />
                    {item.itemName}
                  </p>
                  <p className="ct-item-price">{money(item.price)}</p>
                </div>
                <div className="ct-stepper">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => handleRemove(item.id)}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => handleAdd(item.id)}
                  >
                    +
                  </button>
                </div>
                <p className="ct-item-total">{money(item.price * item.quantity)}</p>
                <button
                  type="button"
                  className="ct-remove"
                  aria-label={`Remove ${item.itemName}`}
                  title="Remove"
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="ct-card ct-summary">
          <h3>Bill details</h3>
          <div className="ct-bill-row">
            <span>Item total</span>
            <span>{money(totalPrice)}</span>
          </div>
          <p className="ct-bill-note">
            Delivery fee and taxes are added when you place the order.
          </p>
          <button className="ct-btn primary" onClick={handleCheckout}>
            Proceed to Checkout
          </button>
          {restaurantId != null && (
            <button
              className="ct-btn secondary"
              onClick={() => navigate(`/restaurant/${restaurantId}`)}
            >
              Add more items
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Cart;
