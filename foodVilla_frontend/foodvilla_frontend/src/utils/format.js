// Rupee amount with Indian digit grouping, e.g. 1234.5 -> "₹1,234.5".
export const money = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Neutral placeholder for food items with no image (or whose image fails to
// load) — inline so it can't itself 404.
export const FOOD_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f3f3f3"/><text x="32" y="42" font-size="28" text-anchor="middle">🍽️</text></svg>'
  );
