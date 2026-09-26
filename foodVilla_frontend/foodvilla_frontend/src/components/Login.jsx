import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaEnvelope, FaLock } from "react-icons/fa";
import { login as loginApi } from "../services/authApi";
import { useAuth } from "../context/AuthContext";
import AuthField from "./AuthField";
import "../styles/Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setSubmitting(true);

    try {
      const res = await loginApi(formData.email, formData.password);
      setMessage(res.data.message);

      if (res.status === 200) {
        login(res.data.token, res.data);
        const redirectTo = location.state?.from?.pathname || "/";
        setTimeout(() => navigate(redirectTo, { replace: true }), 1000);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
      setIsError(true);
      setSubmitting(false);
    }
  };

  return (
    <main className="lg-page">
      <section className="lg-card">
        <aside className="lg-aside">
          <span className="lg-tag">Traditional cuisine &amp; spices</span>
          <h2 className="lg-aside-title">Good food is waiting for you.</h2>
          <p className="lg-aside-text">
            Sign in to pick up where you left off — your cart, your orders and
            your favourite restaurants.
          </p>
          <ul className="lg-perks">
            <li>
              <FaCheckCircle aria-hidden="true" /> Browse restaurants &amp; menus
            </li>
            <li>
              <FaCheckCircle aria-hidden="true" /> Track every order
            </li>
            <li>
              <FaCheckCircle aria-hidden="true" /> Check out in a few taps
            </li>
          </ul>
        </aside>

        <div className="lg-main">
          <h1 className="lg-title">Welcome back</h1>
          <p className="lg-sub">Log in to your FoodVilla account</p>

          {message && (
            <p
              className={`lg-message ${isError ? "lg-message--error" : "lg-message--ok"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <form className="lg-form" onSubmit={handleSubmit}>
            <AuthField
              label="Email"
              icon={FaEnvelope}
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <AuthField
              label="Password"
              icon={FaLock}
              type="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <button type="submit" className="lg-submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="lg-switch">
            Don't have an account?{" "}
            <Link to="/signup" className="lg-link">
              Sign Up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Login;
