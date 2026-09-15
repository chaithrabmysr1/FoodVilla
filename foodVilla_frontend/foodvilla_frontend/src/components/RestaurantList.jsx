import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/RestaurantList.css";

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:8082/api/restaurants/getAllRestaurants")
      .then((res) => setRestaurants(res.data || []))
      .catch((err) => console.error(err));
  }, []);

  const handleCardClick = (id) => {
    navigate(`/restaurant/${id}`);
  };

  return (
    <div className="restaurant-list-wrapper">
      <div className="restaurant-list">
        {restaurants.map((restaurant) => (
          <div
            className="restaurant-card"
            key={restaurant.id}
            onClick={() => handleCardClick(restaurant.id)}
          >
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="restaurant-image"
            />
            <div className="restaurant-card-content">
              <h3>{restaurant.name}</h3>
              <p>{restaurant.description}</p>
              <div className="rating-delivery">
                <span className="rating">⭐ {restaurant.rating}</span>
                <span className="delivery-time">{restaurant.deliveryTime}</span>
              </div>
              <p>{restaurant.address}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantList;
