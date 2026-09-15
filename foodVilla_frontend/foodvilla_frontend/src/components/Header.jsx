
import React, { useEffect, useState } from "react";
import {
  FaSearch,
  FaQuestionCircle,
  FaUserPlus,
  FaShoppingCart,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // ✅ Function to calculate and update cart count
  const updateCartCount = () => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = storedCart.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    setCartCount(totalItems);
  };

  // ✅ On mount → load from localStorage
  useEffect(() => {
    updateCartCount();

    // ✅ Listen for any "cartUpdated" events fired from other pages
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // ✅ Navigate to cart page
  const goToCart = () => {
    navigate("/cart");
  };

  return (
    <div className="header">
      <div className="logo-section">
        <img
          src="https://cdn-icons-png.flaticon.com/512/3595/3595455.png"
          alt="FoodVilla Logo"
          className="logo"
        />
        <h2 className="logo-text">FoodVilla</h2>
      </div>

      <div className="menu-items">
        <div className="menu-item" onClick={() => navigate("/search")}>
          <FaSearch className="icon" />
          <span>Search</span>
        </div>


        <div className="menu-item" onClick={() => navigate("/help")}>
          <FaQuestionCircle className="icon" />
          <span>Help</span>
        </div>


        {/* ✅ Sign Up click */}
        <div className="menu-item" onClick={() => navigate("/signup")}>
          <FaUserPlus className="icon" />
          <span>Sign Up</span>
        </div>

        {/* 🛒 Cart Section */}
        <div className="menu-item cart-icon" onClick={goToCart}>
          <FaShoppingCart className="icon" />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          <span>Cart</span>
        </div>
      </div>
    </div>
  );
};

export default Header;