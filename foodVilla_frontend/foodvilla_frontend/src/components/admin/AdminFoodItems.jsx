import React, { useEffect, useState } from "react";
import {
  createFoodItem,
  deleteFoodItem,
  getAllFoodItems,
  updateFoodItem,
} from "../../services/catalogueApi";
import { getAllRestaurants } from "../../services/restaurantApi";
import "../../styles/Admin.css";

const EMPTY_FORM = {
  itemName: "",
  itemDescription: "",
  isVeg: true,
  price: 0,
  imageUrl: "",
  restaurantId: "",
  quantity: 0,
};

const AdminFoodItems = () => {
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");

  const load = () => {
    getAllFoodItems()
      .then((res) => setItems(res.data || []))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load food items"));
    getAllRestaurants()
      .then((res) => setRestaurants(res.data || []))
      .catch(() => {});
  };

  useEffect(load, []);

  const restaurantName = (id) => restaurants.find((r) => r.id === id)?.name || `#${id}`;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, restaurantId: restaurants[0]?.id || "" });
    setShowForm(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ ...EMPTY_FORM, ...item, isVeg: item.isVeg ?? true });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
        restaurantId: Number(form.restaurantId),
      };
      if (editingId) {
        await updateFoodItem(editingId, payload);
      } else {
        await createFoodItem(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save food item");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this food item?")) return;
    try {
      await deleteFoodItem(id);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete food item");
    }
  };

  const visibleItems = restaurantFilter
    ? items.filter((i) => String(i.restaurantId) === String(restaurantFilter))
    : items;

  return (
    <div>
      <div className="admin-page-header">
        <h2>Food Items</h2>
        <button className="admin-btn" onClick={startCreate} disabled={restaurants.length === 0}>
          + Add Food Item
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-filter-bar">
        <select value={restaurantFilter} onChange={(e) => setRestaurantFilter(e.target.value)}>
          <option value="">All restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="admin-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Item name
              <input name="itemName" value={form.itemName} onChange={handleChange} required />
            </label>
            <label>
              Restaurant
              <select name="restaurantId" value={form.restaurantId} onChange={handleChange} required>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <input name="itemDescription" value={form.itemDescription} onChange={handleChange} />
            </label>
            <label>
              Image URL
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange} />
            </label>
            <label>
              Price (₹)
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required />
            </label>
            <label>
              Quantity available
              <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} />
            </label>
            <label className="admin-checkbox-label">
              <input name="isVeg" type="checkbox" checked={form.isVeg} onChange={handleChange} />
              Vegetarian
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

      {visibleItems.length === 0 ? (
        <p className="admin-empty">No food items yet.</p>
      ) : (
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Restaurant</th>
              <th>Price</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td>{item.itemName}</td>
                <td>{restaurantName(item.restaurantId)}</td>
                <td>₹{item.price}</td>
                <td>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</td>
                <td>{item.quantity ?? "-"}</td>
                <td>
                  <button className="admin-btn secondary" onClick={() => startEdit(item)}>
                    Edit
                  </button>{" "}
                  <button className="admin-btn danger" onClick={() => handleDelete(item.id)}>
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

export default AdminFoodItems;
