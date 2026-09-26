import React, { useEffect, useState } from "react";
import {
  FaSearch,
  FaQuestionCircle,
  FaShoppingCart,
  FaReceipt,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserShield,
} from "react-icons/fa";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "../styles/Header.css";

const navLinkClass =
  (extra = "") =>
  ({ isActive }) =>
    `nb-link${extra ? ` ${extra}` : ""}${isActive ? " nb-link--active" : ""}`;

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="nb">
      <div className="nb-inner">
        <Link to="/" className="nb-brand" aria-label="FoodVilla home">
          <img src={logo} alt="FoodVilla" className="nb-logo" />
        </Link>

        <nav className="nb-links" aria-label="Main">
          <NavLink to="/search" className={navLinkClass()}>
            <FaSearch className="nb-icon" aria-hidden="true" />
            <span className="nb-label">Search</span>
          </NavLink>

          <NavLink to="/help" className={navLinkClass()}>
            <FaQuestionCircle className="nb-icon" aria-hidden="true" />
            <span className="nb-label">Help</span>
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/orders" className={navLinkClass()}>
                <FaReceipt className="nb-icon" aria-hidden="true" />
                <span className="nb-label">My Orders</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass()}>
                  <FaUserShield className="nb-icon" aria-hidden="true" />
                  <span className="nb-label">Admin</span>
                </NavLink>
              )}

              <button
                type="button"
                className="nb-link"
                onClick={handleLogout}
                title={user?.fullName}
              >
                <FaSignOutAlt className="nb-icon" aria-hidden="true" />
                <span className="nb-label">Logout</span>
              </button>
            </>
          ) : (
            // one entry point: the login and signup pages link to each other
            <NavLink to="/login" className={navLinkClass("nb-link--cta")}>
              <FaSignInAlt className="nb-icon" aria-hidden="true" />
              <span className="nb-label">Login / Sign Up</span>
            </NavLink>
          )}

          {/* 🛒 Cart Section */}
          <NavLink
            to="/cart"
            className={navLinkClass("nb-link--cart")}
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
          >
            <span className="nb-cart-icon">
              <FaShoppingCart className="nb-icon" aria-hidden="true" />
              {cartCount > 0 && <span className="nb-badge">{cartCount}</span>}
            </span>
            <span className="nb-label">Cart</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
