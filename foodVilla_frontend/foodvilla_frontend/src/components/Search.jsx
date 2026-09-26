import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaChevronRight,
  FaMinus,
  FaPlus,
  FaRegClock,
  FaSearch,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import { getAllRestaurants } from "../services/restaurantApi";
import { getAllFoodItems } from "../services/catalogueApi";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import "../styles/Search.css";

const RECENT_KEY = "recentSearches";
const MAX_RECENT = 5;

// Quick-search tiles. Only tiles that match something in the live catalogue
// are shown, so a tile never leads to an empty result.
const CATEGORIES = [
  { label: "Pizza", emoji: "🍕" },
  { label: "Biryani", emoji: "🍛" },
  { label: "Burger", emoji: "🍔" },
  { label: "Paneer", emoji: "🧀" },
  { label: "Dosa", emoji: "🥞" },
  { label: "Noodles", emoji: "🍜" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Chicken", emoji: "🍗" },
  { label: "Wrap", emoji: "🌯" },
  { label: "Salad", emoji: "🥗" },
  { label: "Dessert", emoji: "🍰" },
  { label: "Ice cream", emoji: "🍨" },
  { label: "Shake", emoji: "🥤" },
  { label: "Coffee", emoji: "☕" },
];

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
};

const readRecent = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const tokenize = (term) => term.toLowerCase().split(/\s+/).filter(Boolean);

// Every word of the query must appear somewhere in the text.
const matchesAll = (text, tokens) => {
  const haystack = (text || "").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Catalogue images are hot-linked third-party URLs; swap in the placeholder
// when one fails to load.
const onImageError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FOOD_PLACEHOLDER;
};

// Bolds the part of `text` that matched the query.
const Highlight = ({ text, tokens }) => {
  if (!text) return null;
  if (tokens.length === 0) return text;
  const parts = text.split(new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="sr-mark">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Standard Indian veg / non-veg marker.
const VegMark = ({ isVeg }) => (
  <span
    className={`sr-veg ${isVeg ? "sr-veg--veg" : "sr-veg--non"}`}
    role="img"
    aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
  />
);

const RestaurantCard = ({ restaurant, tokens }) => {
  const closed = restaurant.isOpen === false;
  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className={`sr-rest${closed ? " is-closed" : ""}`}
    >
      <div className="sr-rest-media">
        <img
          src={restaurant.imageUrl || FOOD_PLACEHOLDER}
          alt=""
          loading="lazy"
          onError={onImageError}
        />
        {restaurant.rating != null && (
          <span className="sr-rating">
            <FaStar aria-hidden="true" /> {restaurant.rating}
          </span>
        )}
        {closed && <span className="sr-closed">Closed</span>}
      </div>
      <div className="sr-rest-body">
        <h3 className="sr-rest-name">
          <Highlight text={restaurant.name} tokens={tokens} />
        </h3>
        <p className="sr-rest-desc">
          <Highlight text={restaurant.description} tokens={tokens} />
        </p>
        <p className="sr-rest-meta">
          {restaurant.deliveryTime && (
            <span>
              <FaRegClock aria-hidden="true" /> {restaurant.deliveryTime}
            </span>
          )}
          {restaurant.costForTwo != null && <span>{money(restaurant.costForTwo)} for two</span>}
        </p>
      </div>
    </Link>
  );
};

const DishCard = ({ item, quantity, tokens, onAdd, onRemove }) => {
  return (
    <article className="sr-dish">
      <div className="sr-dish-info">
        <VegMark isVeg={item.isVeg} />
        <h3 className="sr-dish-name">
          <Highlight text={item.itemName} tokens={tokens} />
        </h3>
        <p className="sr-dish-price">{money(item.price)}</p>
        {item.itemDescription && (
          <p className="sr-dish-desc">
            <Highlight text={item.itemDescription} tokens={tokens} />
          </p>
        )}
        <Link className="sr-dish-rest" to={`/restaurant/${item.restaurantId}`}>
          {item.restaurantName} <FaChevronRight aria-hidden="true" />
        </Link>
      </div>

      <div className="sr-dish-media">
        <img
          className="sr-dish-img"
          src={item.imageUrl || FOOD_PLACEHOLDER}
          alt=""
          loading="lazy"
          onError={onImageError}
        />
        {quantity > 0 ? (
          <div className="sr-stepper" role="group" aria-label={`Quantity of ${item.itemName}`}>
            <button type="button" aria-label="Remove one" onClick={() => onRemove(item)}>
              <FaMinus aria-hidden="true" />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" aria-label="Add one more" onClick={() => onAdd(item)}>
              <FaPlus aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sr-add"
            aria-label={`Add ${item.itemName} to cart`}
            onClick={() => onAdd(item)}
          >
            ADD
          </button>
        )}
      </div>
    </article>
  );
};

const SkeletonBlock = () => (
  <div className="sr-skeleton" aria-hidden="true">
    <div className="sr-sk sr-sk-title" />
    <div className="sr-sk-grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="sr-sk sr-sk-card" />
      ))}
    </div>
  </div>
);

const Search = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [term, setTerm] = useState(() => searchParams.get("q") || "");
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [cart, setCart] = useState(readCart);
  const [recent, setRecent] = useState(readRecent);
  const [diet, setDiet] = useState("all"); // all | veg | nonveg
  const [sort, setSort] = useState("relevance"); // relevance | low | high

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([getAllRestaurants(), getAllFoodItems()])
      .then(([restaurantRes, itemRes]) => {
        const restaurantList = restaurantRes.data || [];
        const byId = new Map(restaurantList.map((r) => [String(r.id), r]));
        const itemList = Array.isArray(itemRes.data) ? itemRes.data : itemRes.data?.foodItems || [];
        setRestaurants(restaurantList);
        setItems(
          itemList
            .filter((item) => byId.has(String(item.restaurantId)))
            .map((item) => ({
              ...item,
              restaurantName: byId.get(String(item.restaurantId)).name,
            }))
        );
        setStatus("ready");
      })
      .catch((err) => {
        console.error(err);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the query in the URL so Back from a restaurant returns to the results.
  useEffect(() => {
    const urlTerm = searchParams.get("q") || "";
    const wanted = term.trim() ? term : "";
    if (urlTerm !== wanted) {
      setSearchParams(wanted ? { q: wanted } : {}, { replace: true });
    }
  }, [term, searchParams, setSearchParams]);

  const tokens = useMemo(() => tokenize(term), [term]);
  const searching = tokens.length > 0;

  const restaurantMatches = useMemo(
    () =>
      searching
        ? restaurants.filter((r) => matchesAll(`${r.name} ${r.description || ""}`, tokens))
        : [],
    [restaurants, tokens, searching]
  );

  // Dishes whose name matches come before ones that only match the description.
  const dishMatches = useMemo(() => {
    if (!searching) return [];
    return items
      .filter((i) => matchesAll(`${i.itemName} ${i.itemDescription || ""}`, tokens))
      .sort((a, b) => Number(!matchesAll(a.itemName, tokens)) - Number(!matchesAll(b.itemName, tokens)));
  }, [items, tokens, searching]);

  const visibleDishes = useMemo(() => {
    let list = dishMatches;
    if (diet === "veg") list = list.filter((i) => i.isVeg);
    if (diet === "nonveg") list = list.filter((i) => !i.isVeg);
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [dishMatches, diet, sort]);

  const categories = useMemo(
    () =>
      CATEGORIES.filter((cat) => {
        const catTokens = tokenize(cat.label);
        return (
          items.some((i) => matchesAll(`${i.itemName} ${i.itemDescription || ""}`, catTokens)) ||
          restaurants.some((r) => matchesAll(`${r.name} ${r.description || ""}`, catTokens))
        );
      }),
    [items, restaurants]
  );

  const topRestaurants = useMemo(
    () =>
      [...restaurants]
        .sort(
          (a, b) =>
            Number(a.isOpen === false) - Number(b.isOpen === false) ||
            (b.rating || 0) - (a.rating || 0)
        )
        .slice(0, 6),
    [restaurants]
  );

  // One dish from each of the top-rated restaurants.
  const topPicks = useMemo(
    () =>
      topRestaurants
        .map((r) => items.find((i) => String(i.restaurantId) === String(r.id)))
        .filter(Boolean),
    [topRestaurants, items]
  );

  const quantityById = useMemo(() => new Map(cart.map((c) => [c.id, c.quantity])), [cart]);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const saveCart = (next) => {
    localStorage.setItem("cart", JSON.stringify(next));
    window.dispatchEvent(new Event("cartUpdated"));
    setCart(next);
  };

  // An order can only belong to one restaurant. If the cart already holds
  // items from a different restaurant, confirm before replacing it.
  const handleAdd = (item) => {
    let next = readCart();
    const cartRestaurantId = next[0]?.restaurantId;
    if (cartRestaurantId != null && String(cartRestaurantId) !== String(item.restaurantId)) {
      const proceed = window.confirm(
        "Your cart has items from another restaurant. Start a new cart with items from this restaurant?"
      );
      if (!proceed) return;
      next = [];
    }
    next = next.some((c) => c.id === item.id)
      ? next.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      : [...next, { ...item, quantity: 1 }];
    saveCart(next);
  };

  const handleRemove = (item) => {
    saveCart(
      readCart().flatMap((c) => {
        if (c.id !== item.id) return [c];
        return c.quantity > 1 ? [{ ...c, quantity: c.quantity - 1 }] : [];
      })
    );
  };

  const rememberSearch = (value) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT
    );
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    rememberSearch(term);
    inputRef.current?.blur();
  };

  const handleRecentClick = (value) => {
    setTerm(value);
    rememberSearch(value);
  };

  const clearTerm = () => {
    setTerm("");
    inputRef.current?.focus();
  };

  const renderDishes = (list) =>
    list.map((item) => (
      <DishCard
        key={item.id}
        item={item}
        quantity={quantityById.get(item.id) || 0}
        tokens={tokens}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    ));

  const renderDiscover = () => (
    <>
      {recent.length > 0 && (
        <section className="sr-section">
          <div className="sr-section-head">
            <h2>Recent searches</h2>
            <button type="button" className="sr-link-btn" onClick={clearRecent}>
              Clear all
            </button>
          </div>
          <div className="sr-chips">
            {recent.map((t) => (
              <button key={t} type="button" className="sr-chip" onClick={() => handleRecentClick(t)}>
                <FaRegClock aria-hidden="true" /> {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="sr-section">
          <div className="sr-section-head">
            <h2>What&apos;s on your mind?</h2>
          </div>
          <div className="sr-cats">
            {categories.map((cat) => (
              <button
                key={cat.label}
                type="button"
                className="sr-cat"
                onClick={() => setTerm(cat.label)}
              >
                <span className="sr-cat-icon" aria-hidden="true">
                  {cat.emoji}
                </span>
                <span className="sr-cat-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {topRestaurants.length > 0 && (
        <section className="sr-section">
          <div className="sr-section-head">
            <h2>Top-rated restaurants</h2>
          </div>
          <div className="sr-rest-grid">
            {topRestaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} tokens={tokens} />
            ))}
          </div>
        </section>
      )}

      {topPicks.length > 0 && (
        <section className="sr-section">
          <div className="sr-section-head">
            <h2>Top picks</h2>
          </div>
          <div className="sr-dish-grid">{renderDishes(topPicks)}</div>
        </section>
      )}
    </>
  );

  const renderResults = () => {
    if (dishMatches.length === 0 && restaurantMatches.length === 0) {
      return (
        <div className="sr-empty">
          <div className="sr-empty-emoji" aria-hidden="true">
            🍽️
          </div>
          <h2>No results for &ldquo;{term.trim()}&rdquo;</h2>
          <p>Check the spelling or try one of these instead.</p>
          <div className="sr-chips sr-chips--center">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.label}
                type="button"
                className="sr-chip"
                onClick={() => setTerm(cat.label)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        <p className="sr-summary" role="status">
          {[
            dishMatches.length > 0 && count(dishMatches.length, "dish", "dishes"),
            restaurantMatches.length > 0 && count(restaurantMatches.length, "restaurant", "restaurants"),
          ]
            .filter(Boolean)
            .join(" · ")}{" "}
          for <strong>&ldquo;{term.trim()}&rdquo;</strong>
        </p>

        {restaurantMatches.length > 0 && (
          <section className="sr-section">
            <div className="sr-section-head">
              <h2>Restaurants</h2>
            </div>
            <div className="sr-rest-grid">
              {restaurantMatches.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} tokens={tokens} />
              ))}
            </div>
          </section>
        )}

        {dishMatches.length > 0 && (
          <section className="sr-section">
            <div className="sr-section-head">
              <h2>Dishes</h2>
            </div>

            <div className="sr-filters">
              <div className="sr-chips" role="group" aria-label="Filter by diet">
                {[
                  ["all", "All"],
                  ["veg", "Veg"],
                  ["nonveg", "Non-veg"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`sr-chip${diet === value ? " is-active" : ""}`}
                    aria-pressed={diet === value}
                    onClick={() => setDiet(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="sr-sort">
                <span>Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="relevance">Relevance</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
            </div>

            {visibleDishes.length === 0 ? (
              <p className="sr-note">
                No {diet === "veg" ? "vegetarian" : "non-vegetarian"} dishes match.{" "}
                <button type="button" className="sr-link-btn" onClick={() => setDiet("all")}>
                  Show all
                </button>
              </p>
            ) : (
              <div className="sr-dish-grid">{renderDishes(visibleDishes)}</div>
            )}
          </section>
        )}
      </>
    );
  };

  const renderBody = () => {
    if (status === "loading") {
      return (
        <div aria-busy="true">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="sr-empty">
          <div className="sr-empty-emoji" aria-hidden="true">
            😕
          </div>
          <h2>Couldn&apos;t load the menu</h2>
          <p>Something went wrong while fetching food. Please try again.</p>
          <button type="button" className="sr-primary-btn" onClick={load}>
            Try again
          </button>
        </div>
      );
    }
    return searching ? renderResults() : renderDiscover();
  };

  return (
    <div className={`sr-page${totalItems > 0 ? " sr-page--with-cart" : ""}`}>
      <div className="sr-container">
        <section className="sr-hero">
          <span className="sr-hero-deco sr-hero-deco--a" aria-hidden="true">
            🍕
          </span>
          <span className="sr-hero-deco sr-hero-deco--b" aria-hidden="true">
            🍜
          </span>
          <span className="sr-hero-deco sr-hero-deco--c" aria-hidden="true">
            🥗
          </span>
          <h1 className="sr-hero-title">What are you craving today?</h1>
          <p className="sr-hero-sub">Search for dishes, cuisines or restaurants</p>
          <form className="sr-searchbar" role="search" onSubmit={handleSubmit}>
            <FaSearch className="sr-searchbar-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              className="sr-searchbar-input"
              placeholder="Search for pizza, biryani, dosa…"
              aria-label="Search food"
              autoComplete="off"
              enterKeyHint="search"
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setTerm("")}
            />
            {term && (
              <button
                type="button"
                className="sr-searchbar-clear"
                aria-label="Clear search"
                onClick={clearTerm}
              >
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </form>
        </section>

        {renderBody()}
      </div>

      {totalItems > 0 && (
        <button type="button" className="sr-cartbar" onClick={() => navigate("/cart")}>
          <span className="sr-cartbar-info">
            <strong>
              {count(totalItems, "item", "items")} &middot; {money(totalPrice)}
            </strong>
            {cart[0]?.restaurantName && <small>from {cart[0].restaurantName}</small>}
          </span>
          <span className="sr-cartbar-cta">
            View cart <FaChevronRight aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
};

export default Search;
