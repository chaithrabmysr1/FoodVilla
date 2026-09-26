import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaUser,
} from "react-icons/fa";
import { signup as signupApi } from "../services/authApi";
import AuthField from "./AuthField";
import "../styles/Auth.css";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    role: "USER", // ✅ default role
  });
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
      const res = await signupApi(formData);
      setMessage(res.data.message);
      if (res.status === 200) {
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Signup failed");
      setIsError(true);
      setSubmitting(false);
    }
  };

  return (
    <main className="lg-page">
      <section className="lg-card lg-card--wide">
        <aside className="lg-aside">
          <span className="lg-tag">Join FoodVilla</span>
          <h2 className="lg-aside-title">Your table is ready.</h2>
          <p className="lg-aside-text">
            Create an account to order from your favourite restaurants and keep
            track of every order.
          </p>
          <ul className="lg-perks">
            <li>
              <FaCheckCircle aria-hidden="true" /> Save your address once
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
          <h1 className="lg-title">Create your account</h1>
          <p className="lg-sub">It only takes a minute.</p>

          {message && (
            <p
              className={`lg-message ${isError ? "lg-message--error" : "lg-message--ok"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <form className="lg-form" onSubmit={handleSubmit}>
            <h3 className="lg-section">Your details</h3>
            <AuthField
              label="Full name"
              icon={FaUser}
              name="fullName"
              placeholder="Your full name"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <div className="lg-row lg-row--2">
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
                label="Phone number"
                icon={FaPhoneAlt}
                type="tel"
                name="phoneNumber"
                placeholder="Phone number"
                autoComplete="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>
            <AuthField
              label="Password"
              icon={FaLock}
              type="password"
              name="password"
              placeholder="Create a password"
              hint="At least 6 characters"
              autoComplete="new-password"
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              required
            />

            <h3 className="lg-section">Address</h3>
            <AuthField
              label="Address"
              icon={FaMapMarkerAlt}
              name="address"
              placeholder="House no., street, area"
              autoComplete="street-address"
              value={formData.address}
              onChange={handleChange}
              required
            />
            <div className="lg-row lg-row--3">
              <AuthField
                label="City"
                name="city"
                placeholder="City"
                autoComplete="address-level2"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <AuthField
                label="State"
                name="state"
                placeholder="State"
                autoComplete="address-level1"
                value={formData.state}
                onChange={handleChange}
                required
              />
              <AuthField
                label="Pincode"
                name="pincode"
                placeholder="Pincode"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                title="Enter a 6-digit pincode"
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="lg-submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="lg-switch">
            Already have an account?{" "}
            <Link to="/login" className="lg-link">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Signup;
