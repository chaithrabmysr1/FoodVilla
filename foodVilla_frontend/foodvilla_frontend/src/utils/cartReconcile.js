// Brings a saved cart back in line with the live catalogue.
//
// Why this exists: the cart lives in localStorage, so it can outlive the menu it
// was built from — an item gets removed, or the catalogue is corrected and the
// item now belongs to a different restaurant. The backend prices an order
// against ONE restaurant (the cart's first item) and answers 404 for any item
// that isn't on that restaurant's menu, which used to leave checkout stuck with
// a disabled "Proceed to Payment". Checkout calls this once when that happens.
//
// Returns { items, removed }: `items` is the cart with each line refreshed from
// the catalogue and reduced to a single restaurant (the first surviving line's);
// `removed` holds the lines that had to go. Returns null when the catalogue
// can't be trusted (empty / malformed), so the caller leaves the cart alone.
export const reconcileCart = (cart, catalogue) => {
  if (!Array.isArray(catalogue) || catalogue.length === 0) return null;

  const liveById = new Map(catalogue.map((item) => [item.id, item]));
  const refreshed = [];
  const removed = [];

  cart.forEach((line) => {
    const live = liveById.get(line.id);
    if (!live) {
      removed.push(line);
      return;
    }
    refreshed.push({
      ...line,
      itemName: live.itemName,
      price: live.price,
      imageUrl: live.imageUrl,
      isVeg: live.isVeg,
      restaurantId: live.restaurantId,
    });
  });

  const restaurantId = refreshed[0]?.restaurantId;
  const items = refreshed.filter((line) => line.restaurantId === restaurantId);
  refreshed.forEach((line) => {
    if (line.restaurantId !== restaurantId) removed.push(line);
  });

  return { items, removed };
};
