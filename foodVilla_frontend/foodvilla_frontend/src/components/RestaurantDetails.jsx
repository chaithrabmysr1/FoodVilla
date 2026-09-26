import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantById } from "../services/restaurantApi";
import { getCatalogueByRestaurant } from "../services/catalogueApi";
import { money } from "../utils/format";
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

  if (!restaurant) {
    return (
      <div className="restaurant-details-page">
        <p className="rd-state">Loading restaurant details...</p>
      </div>
    );
  }

  const cuisines = Array.isArray(restaurant.cuisines) ? restaurant.cuisines : [];

  return (
    <div className="restaurant-details-page">
      <header className="rd-hero">
        <div className="rd-hero-top">
          <h1 className="rd-name">{restaurant.name || "Restaurant Name"}</h1>
          <span className={`rd-status ${restaurant.isOpen ? "open" : "closed"}`}>
            {restaurant.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="rd-facts">
          <span className="rd-rating">★ {restaurant.rating || "N/A"}</span>
          <span className="rd-fact">
            {restaurant.costForTwo ? money(restaurant.costForTwo) : "₹-"} for two
          </span>
        </div>

        {cuisines.length > 0 ? (
          <ul className="rd-cuisines">
            {cuisines.map((cuisine) => (
              <li key={cuisine}>{cuisine}</li>
            ))}
          </ul>
        ) : (
          <p className="rd-muted">Cuisines not available</p>
        )}

        <p className="rd-address">
          <span aria-hidden="true">📍</span> {restaurant.address || "Address not available"}
        </p>
      </header>

      {foodItems.length > 0 && (
        <div className="rd-menu-head">
          <h2>Menu</h2>
          <span>
            {foodItems.length} item{foodItems.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="food-items-list">
        {foodItems.length === 0 ? (
          <p className="rd-state">No food items available.</p>
        ) : (
          foodItems.map((item) => (
            <div className="food-item-row rd-item" key={item.id}>
              <img src={item.imageUrl || "/default-food.png"} alt={item.itemName || "Food"} />
              <div className="food-text">
                <h4>{item.itemName || "Food Name"}</h4>
                <p>{item.itemDescription || "Description not available"}</p>
                <p>₹ {item.price || "-"}</p>
                <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"}</p>
              </div>
              <div className="rd-action">
                {item.quantity > 0 ? (
                  <div className="rd-stepper" role="group" aria-label="Quantity">
                    <button type="button" aria-label="Remove one" onClick={() => handleRemove(item.id)}>
                      −
                    </button>
                    <span className="rd-qty" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button type="button" aria-label="Add one" onClick={() => handleAdd(item.id)}>
                      +
                    </button>
                  </div>
                ) : (
                  <button type="button" className="rd-add" onClick={() => handleAdd(item.id)}>
                    Add
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalItems > 0 && (
        <div className="rd-cartbar">
          <button type="button" className="rd-cartbar-btn" onClick={goToCart}>
            <span className="rd-cartbar-info">
              <strong>
                {totalItems} item{totalItems > 1 ? "s" : ""}
              </strong>
              <span aria-hidden="true"> | </span>
              {money(totalPrice)}
            </span>
            <span className="rd-cartbar-cta">Go to Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetails;
