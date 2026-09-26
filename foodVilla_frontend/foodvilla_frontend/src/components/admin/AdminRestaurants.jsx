import React, { useEffect, useState } from "react";
import {
  createRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  updateRestaurant,
} from "../../services/restaurantApi";
import "../../styles/Admin.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  rating: 0,
  deliveryTime: "",
  address: "",
  imageUrl: "",
  costForTwo: 0,
  isOpen: true,
};

const AdminRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const load = () => {
    getAllRestaurants()
      .then((res) => setRestaurants(res.data || []))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load restaurants"));
  };

  useEffect(load, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setForm({ ...EMPTY_FORM, ...restaurant, isOpen: restaurant.isOpen ?? true });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const payload = {
        ...form,
        rating: Number(form.rating),
        costForTwo: Number(form.costForTwo),
      };
      if (editingId) {
        await updateRestaurant(editingId, payload);
      } else {
        await createRestaurant(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save restaurant");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this restaurant?")) return;
    try {
      await deleteRestaurant(id);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete restaurant");
    }
  };

  const toggleOpen = async (restaurant) => {
    try {
      await updateRestaurant(restaurant.id, { ...restaurant, isOpen: !restaurant.isOpen });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update restaurant");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h2>Restaurants</h2>
        <button className="admin-btn" onClick={startCreate}>
          + Add Restaurant
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
              Delivery time
              <input name="deliveryTime" value={form.deliveryTime} onChange={handleChange} placeholder="30 mins" />
            </label>
            <label>
              Description
              <input name="description" value={form.description} onChange={handleChange} />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
            <label>
              Image URL
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange} />
            </label>
            <label>
              Rating
              <input name="rating" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={handleChange} />
            </label>
            <label>
              Cost for two (₹)
              <input name="costForTwo" type="number" min="0" value={form.costForTwo} onChange={handleChange} />
            </label>
            <label className="admin-checkbox-label">
              <input name="isOpen" type="checkbox" checked={form.isOpen} onChange={handleChange} />
              Currently open
            </label>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">
                {editingId ? "Save changes" : "Create"}
              </button>
              <button className="admin-btn secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {restaurants.length === 0 ? (
        <p className="admin-empty">No restaurants yet.</p>
      ) : (
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rating</th>
              <th>Delivery time</th>
              <th>Cost for two</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>⭐ {r.rating}</td>
                <td>{r.deliveryTime}</td>
                <td>₹{r.costForTwo}</td>
                <td>{r.isOpen ? "Open" : "Closed"}</td>
                <td>
                  <button className="admin-btn secondary" onClick={() => toggleOpen(r)}>
                    {r.isOpen ? "Close" : "Open"}
                  </button>{" "}
                  <button className="admin-btn secondary" onClick={() => startEdit(r)}>
                    Edit
                  </button>{" "}
                  <button className="admin-btn danger" onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurants;
