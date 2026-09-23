import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRestaurants } from "../services/restaurantApi";
import { getCatalogueByRestaurant } from "../services/catalogueApi";
import "../styles/Search.css";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allFoodItems, setAllFoodItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch all restaurants and their food items
  useEffect(() => {
    const fetchAllFoodItems = async () => {
      try {
        const resRestaurants = await getAllRestaurants();
        const restaurants = resRestaurants.data || [];

        const allItems = [];
        await Promise.all(
          restaurants.map(async (restaurant) => {
            const resFood = await getCatalogueByRestaurant(restaurant.id);
            const items = resFood.data.foodItems || resFood.data || [];
            items.forEach((item) => {
              allItems.push({
                ...item,
                restaurantName: restaurant.name,
                restaurantId: restaurant.id,
                quantity: 0, // initialize quantity
              });
            });
          })
        );

        // Merge with existing cart quantities
        const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
        allItems.forEach((item) => {
          const cartItem = existingCart.find((c) => c.id === item.id);
          if (cartItem) item.quantity = cartItem.quantity;
        });

        setAllFoodItems(allItems);
        setFilteredItems(allItems);

        // Load recent searches from localStorage
        const recent = JSON.parse(localStorage.getItem("recentSearches")) || [];
        setRecentSearches(recent);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAllFoodItems();
  }, []);

  //✅ Filter items as user types
  useEffect(() => {
    const filtered = allFoodItems.filter((item) =>
      item.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, allFoodItems]);

  // ✅ Update recent searches
  const updateRecentSearches = (term) => {
    if (!term.trim()) return;
    let updatedRecent = recentSearches.filter((t) => t !== term);
    updatedRecent.unshift(term);
    if (updatedRecent.length > 5) updatedRecent = updatedRecent.slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem("recentSearches", JSON.stringify(updatedRecent));
  };

  // ✅ Update cart in localStorage
  const updateCartStorage = (updatedItems) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const mergedCartMap = new Map();

    existingCart.forEach((item) => mergedCartMap.set(item.id, { ...item }));
    updatedItems.forEach((item) => {
      if (item.quantity > 0) {
        mergedCartMap.set(item.id, { ...item });
      } else if (mergedCartMap.has(item.id)) {
        mergedCartMap.delete(item.id);
      }
    });

    const mergedCart = Array.from(mergedCartMap.values());
    localStorage.setItem("cart", JSON.stringify(mergedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // An order can only belong to one restaurant. If the cart already holds
  // items from a different restaurant, confirm before replacing it.
  const ensureCartMatchesRestaurant = (newRestaurantId) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    if (existingCart.length === 0) return true;
    const cartRestaurantId = existingCart[0].restaurantId;
    if (cartRestaurantId != null && String(cartRestaurantId) !== String(newRestaurantId)) {
      const proceed = window.confirm(
        "Your cart has items from another restaurant. Start a new cart with items from this restaurant?"
      );
      if (!proceed) return false;
      localStorage.setItem("cart", JSON.stringify([]));
    }
    return true;
  };

  const handleAdd = (itemId) => {
    const target = allFoodItems.find((item) => item.id === itemId);
    if (!ensureCartMatchesRestaurant(target?.restaurantId)) return;

    const updated = allFoodItems.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    setAllFoodItems(updated);
    updateCartStorage(updated);
  };

  const handleRemove = (itemId) => {
    const updated = allFoodItems.map((item) =>
      item.id === itemId && item.quantity > 0
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
    setAllFoodItems(updated);
    updateCartStorage(updated);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleSearchSubmit = (term) => {
    setSearchTerm(term);
    updateRecentSearches(term);
  };

  const goToCart = () => {
    updateCartStorage(allFoodItems);
    navigate("/cart");
  };

  const totalItems = allFoodItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = allFoodItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="search-page">
      <h2>Search Food</h2>
      <input
        type="text"
        placeholder="Type food name..."
        value={searchTerm}
        onChange={handleSearchChange}
        onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(searchTerm)}
        className="search-input"
      />

      {/* ✅ Recent searches */}
      {recentSearches.length > 0 && searchTerm.trim() === "" && (
        <div className="recent-searches">
          <p>Recent Searches:</p>
          <div className="recent-tags">
            {recentSearches.map((term, idx) => (
              <div
                key={idx}
                className="recent-tag"
                onClick={() => handleSearchSubmit(term)}
              >
                {term}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Only show food cards if user types something */}
      {searchTerm.trim() !== "" && (
        <div className="food-cards">
          {filteredItems.length === 0 ? (
            <p>No food found 😔</p>
          ) : (
            filteredItems.map((item) => (
              <div className="food-card" key={item.id}>
                <img
                  src={item.imageUrl || "/default-food.png"}
                  alt={item.itemName}
                  className="food-image"
                />
                <div className="food-details">
                  <h3>{item.itemName}</h3>
                  <p>{item.itemDescription || "No description"}</p>
                  <p>Price: ₹{item.price}</p>
                  <p>{item.isVeg ? "🌱 Veg" : "🍗 Non-Veg"} • {item.restaurantName}</p>
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
      )}

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

export default Search;
