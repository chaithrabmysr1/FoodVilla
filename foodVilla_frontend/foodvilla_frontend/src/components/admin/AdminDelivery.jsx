import React, { useEffect, useState } from "react";
import { createDeliveryPartner, listDeliveryPartners, updateDeliveryPartner } from "../../services/deliveryApi";
import "../../styles/Admin.css";

const EMPTY_FORM = { name: "", phone: "", vehicleType: "" };

const AdminDelivery = () => {
  const [partners, setPartners] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const load = () => {
    listDeliveryPartners(false)
      .then((res) => setPartners(res.data || []))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load delivery partners"));
  };

  useEffect(load, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await createDeliveryPartner(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add delivery partner");
    }
  };

  const toggleField = async (partner, field) => {
    try {
      await updateDeliveryPartner(partner.id, { [field]: !partner[field] });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update delivery partner");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h2>Delivery Partners</h2>
        <button className="admin-btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add Delivery Partner"}
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {showForm && (
        <div className="admin-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={handleChange} required />
            </label>
            <label>
              Vehicle type
              <input name="vehicleType" value={form.vehicleType} onChange={handleChange} placeholder="Bike, Scooter..." />
            </label>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">Create</button>
            </div>
          </form>
        </div>
      )}

      {partners.length === 0 ? (
        <p className="admin-empty">No delivery partners yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Available</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.vehicleType || "-"}</td>
                <td>{p.available ? "Yes" : "No"}</td>
                <td>{p.active ? "Yes" : "No"}</td>
                <td>
                  <button className="admin-btn secondary" onClick={() => toggleField(p, "available")}>
                    Toggle available
                  </button>{" "}
                  <button className="admin-btn secondary" onClick={() => toggleField(p, "active")}>
                    Toggle active
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDelivery;
