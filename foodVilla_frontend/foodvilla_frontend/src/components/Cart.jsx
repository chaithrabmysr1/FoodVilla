import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Cart.css";

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
    localStorage.setItem("lastOrder", JSON.stringify(cartItems));
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
    setCartItems([]);
    navigate("/checkout");
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0)
    return <p className="empty-cart">Your cart is empty.</p>;

  return (
    <div className="cart-page">
      <h2>Your Cart</h2>
      <div className="cart-items">
        {cartItems.map((item) => (
          <div className="cart-item-row" key={item.id}>
            <img
              src={item.imageUrl || "/default-food.png"}
              alt={item.itemName}
            />
            <div className="cart-item-text">
              <h4>{item.itemName}</h4>
              <p>₹ {item.price}</p>
              <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</p>
            </div>
            <div className="cart-quantity-controls">
              <button onClick={() => handleRemove(item.id)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => handleAdd(item.id)}>+</button>
            </div>
            <button className="delete-btn" onClick={() => handleDelete(item.id)}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="cart-footer">
        <h3>Total: ₹ {totalPrice}</h3>
        <button className="checkout-btn" onClick={handleCheckout}>
          Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;
