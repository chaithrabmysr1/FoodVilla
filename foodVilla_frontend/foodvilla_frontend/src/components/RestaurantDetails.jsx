import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantById } from "../services/restaurantApi";
import { getCatalogueByRestaurant } from "../services/catalogueApi";
import "../styles/RestaurantDetails.css";

const RestaurantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [foodItems, setFoodItems] = useState([]);

  useEffect(() => {
    getRestaurantById(id)
      .then((res) => setRestaurant(res.data.restaurant || res.data))
      .catch((err) => console.error(err));

    getCatalogueByRestaurant(id)
      .then((res) => {
        const items = res.data.foodItems || res.data || [];
        setFoodItems(items.map((item) => ({ ...item, quantity: 0 })));
      })
      .catch((err) => console.error(err));
  }, [id]);

  // An order can only belong to one restaurant. If the cart already holds
  // items from a different restaurant, confirm before replacing it —
  // otherwise checkout would silently have to drop items later.
  const confirmReplaceCartIfDifferentRestaurant = (existingCart) => {
    if (existingCart.length === 0) return existingCart;
    const cartRestaurantId = existingCart[0].restaurantId;
    if (cartRestaurantId != null && String(cartRestaurantId) !== String(id)) {
      const proceed = window.confirm(
        "Your cart has items from another restaurant. Start a new cart with items from this restaurant?"
      );
      return proceed ? [] : null;
    }
    return existingCart;
  };

  // ✅ Merge new items into existing cart in localStorage
  const updateCartStorage = (updatedItems) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const base = confirmReplaceCartIfDifferentRestaurant(existingCart);
    if (base === null) return false; // user declined to replace the cart

    const mergedCartMap = new Map();
    base.forEach((item) => mergedCartMap.set(item.id, { ...item }));
    updatedItems.forEach((item) => {
      if (item.quantity > 0) {
        if (mergedCartMap.has(item.id)) {
          mergedCartMap.get(item.id).quantity = item.quantity;
        } else {
          mergedCartMap.set(item.id, { ...item });
        }
      }
    });

    const mergedCart = Array.from(mergedCartMap.values());
    localStorage.setItem("cart", JSON.stringify(mergedCart));
    window.dispatchEvent(new Event("cartUpdated"));
    return true;
  };

  const handleAdd = (itemId) => {
    const updated = foodItems.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    if (updateCartStorage(updated)) {
      setFoodItems(updated);
    }
  };

  const handleRemove = (itemId) => {
    const updated = foodItems.map((item) =>
      item.id === itemId && item.quantity > 0
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
    setFoodItems(updated);
    updateCartStorage(updated);
  };

  const goToCart = () => {
    if (updateCartStorage(foodItems)) {
      navigate("/cart");
    }
  };

  const totalItems = foodItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = foodItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!restaurant) return <p>Loading restaurant details...</p>;

  return (
    <div className="restaurant-details-page">
      <div className="restaurant-header">
        <h1>{restaurant.name || "Restaurant Name"}</h1>
        <p className={`restaurant-status ${restaurant.isOpen ? "open" : "closed"}`}>
          {restaurant.isOpen ? "Open" : "Closed"}
        </p>
        <div className="restaurant-meta">
          <span>⭐ {restaurant.rating || "N/A"}</span>
          <span>• ₹{restaurant.costForTwo || "-"} for two</span>
        </div>
        <div className="restaurant-cuisines">
          {restaurant.cuisines?.join(", ") || "Cuisines not available"}
        </div>
        <div className="restaurant-address">
          {restaurant.address || "Address not available"}
        </div>
      </div>

      <div className="food-items-list">
        {foodItems.length === 0 ? (
          <p>No food items available.</p>
        ) : (
          foodItems.map((item) => (
            <div className="food-item-row" key={item.id}>
              <img src={item.imageUrl || "/default-food.png"} alt={item.itemName || "Food"} />
              <div className="food-text">
                <h4>{item.itemName || "Food Name"}</h4>
                <p>{item.itemDescription || "Description not available"}</p>
                <p>₹ {item.price || "-"}</p>
                <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</p>
              </div>
              {item.quantity > 0 ? (
                <div className="quantity-controls">
                  <button onClick={() => handleRemove(item.id)}>-</button>
                  <span className="quantity">{item.quantity}</span>
                  <button onClick={() => handleAdd(item.id)}>+</button>
                </div>
              ) : (
                <button className="add-btn" onClick={() => handleAdd(item.id)}>
                  Add
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {totalItems > 0 && (
        <button
          className="go-to-cart-btn"
          onClick={goToCart}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "12px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            backgroundColor: "#ff6600",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          🛒 {totalItems} item{totalItems > 1 ? "s" : ""} | ₹{totalPrice} Go to Cart
        </button>
      )}
    </div>
  );
};

export default RestaurantDetails;
