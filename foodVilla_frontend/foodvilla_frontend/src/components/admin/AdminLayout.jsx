import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../styles/Admin.css";

const AdminLayout = () => {
  return (
    <div className="admin-shell">
      <nav className="admin-sidebar">
        <NavLink to="/admin/restaurants" className={({ isActive }) => (isActive ? "active" : "")}>
          Restaurants
        </NavLink>
        <NavLink to="/admin/food-items" className={({ isActive }) => (isActive ? "active" : "")}>
          Food Items
        </NavLink>
        <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? "active" : "")}>
          Orders
        </NavLink>
        <NavLink to="/admin/delivery" className={({ isActive }) => (isActive ? "active" : "")}>
          Delivery
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
          Users
        </NavLink>
      </nav>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
