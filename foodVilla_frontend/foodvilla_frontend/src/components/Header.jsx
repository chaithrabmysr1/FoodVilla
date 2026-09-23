import React, { useEffect, useState } from "react";
import {
  FaSearch,
  FaQuestionCircle,
  FaUserPlus,
  FaShoppingCart,
  FaReceipt,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserShield,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "../styles/Header.css";

const Header = () => {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="header">
      <div className="logo-section" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <img src={logo} alt="FoodVilla" className="logo" />
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

        {isAuthenticated ? (
          <>
            <div className="menu-item" onClick={() => navigate("/orders")}>
              <FaReceipt className="icon" />
              <span>My Orders</span>
            </div>

            {isAdmin && (
              <div className="menu-item" onClick={() => navigate("/admin")}>
                <FaUserShield className="icon" />
                <span>Admin</span>
              </div>
            )}

            <div className="menu-item" onClick={handleLogout} title={user?.fullName}>
              <FaSignOutAlt className="icon" />
              <span>Logout</span>
            </div>
          </>
        ) : (
          <>
            <div className="menu-item" onClick={() => navigate("/login")}>
              <FaSignInAlt className="icon" />
              <span>Login</span>
            </div>

            <div className="menu-item" onClick={() => navigate("/signup")}>
              <FaUserPlus className="icon" />
              <span>Sign Up</span>
            </div>
          </>
        )}

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
