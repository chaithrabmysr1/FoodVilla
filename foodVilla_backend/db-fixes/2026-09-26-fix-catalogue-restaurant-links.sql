-- FoodVilla catalogue data correction: restaurant -> food item links, dish names, one veg flag, one image.
-- Database: foodvilla_foodCatalogueService, table food_items. Data only - no schema change.
--
-- Why: the imported catalogue linked most food items to the wrong restaurant (audit of 2026-09-26:
-- 42 of 48 items did not match their restaurant), stored description sentences as dish names,
-- flagged a pepperoni pizza as Veg, and item 47's image URL returns 404.
--
-- Safe to re-run: every UPDATE is guarded by the row's audited (old) restaurant_id and stored name,
-- so a row that is already corrected, or was edited since, is left alone.
-- NOT applied automatically: db-init/ is only for creating empty databases. Run it by hand, e.g.
--   mysql -u <user> -p < db-fixes/2026-09-26-fix-catalogue-restaurant-links.sql
-- Apply it AFTER the food_items rows exist (ids 2-51 as imported). Take a backup first.
--
-- Item 46 is deleted: it was an exact duplicate of item 14 (same name, price and image, both at Chinese Wok).
-- The DELETE only fires if item 14 still exists with the same price and image AND no order line
-- (foodvilla_orderService.order_items) references item 46, so it can never orphan an order.
-- Left as-is on purpose: items 16 and 17 keep their stored text as name (dish identity is ambiguous);
-- item 14 keeps a photo that shows a burger; restaurants.cost_for_two is untouched.

USE foodvilla_foodCatalogueService;

START TRANSACTION;
UPDATE food_items SET restaurant_id = 1, item_name = 'Buddha Bowl' WHERE id = 2 AND restaurant_id = 8 AND item_name = 'A wholesome bowl of roasted veggies, chickpeas, and hummus';
UPDATE food_items SET restaurant_id = 2, item_name = 'Margherita Pizza' WHERE id = 3 AND restaurant_id = 1 AND item_name = 'Classic pizza with fresh mozzarella and basil';
UPDATE food_items SET restaurant_id = 2, item_name = 'Pepperoni Pizza', veg = 0 WHERE id = 4 AND restaurant_id = 2 AND item_name = 'Topped with pepperoni, cheese, and tomato sauce';
UPDATE food_items SET restaurant_id = 3, item_name = 'Paneer Butter Masala' WHERE id = 5 AND restaurant_id = 3 AND item_name = 'Cottage cheese cooked in rich buttery tomato gravy';
UPDATE food_items SET restaurant_id = 6, item_name = 'Chicken Biryani' WHERE id = 6 AND restaurant_id = 1 AND item_name = 'Aromatic basmati rice cooked with spiced chicken';
UPDATE food_items SET restaurant_id = 4, item_name = 'Veggie Burger' WHERE id = 7 AND restaurant_id = 1 AND item_name = 'Loaded veggie patty with fresh lettuce and cheese';
UPDATE food_items SET restaurant_id = 4, item_name = 'Beef Cheeseburger' WHERE id = 8 AND restaurant_id = 2 AND item_name = 'Juicy beef patty topped with cheddar cheese and sauce';
UPDATE food_items SET restaurant_id = 5, item_name = 'Masala Dosa' WHERE id = 9 AND restaurant_id = 4 AND item_name = 'Crispy dosa filled with spicy potato masala';
UPDATE food_items SET restaurant_id = 5, item_name = 'Rava Dosa' WHERE id = 10 AND restaurant_id = 1 AND item_name = 'Thin, crispy semolina dosa served with coconut chutney';
UPDATE food_items SET restaurant_id = 3, item_name = 'Tandoori Chicken' WHERE id = 11 AND restaurant_id = 1 AND item_name = 'Juicy chicken marinated in yogurt and spices, roasted in tandoor';
UPDATE food_items SET restaurant_id = 3, item_name = 'Paneer Tikka' WHERE id = 12 AND restaurant_id = 1 AND item_name = 'Grilled cubes of paneer marinated in spices and yogurt';
UPDATE food_items SET restaurant_id = 7, item_name = 'Vegetable Noodles' WHERE id = 13 AND restaurant_id = 1 AND item_name = 'Stir-fried noodles with fresh vegetables and sauces';
UPDATE food_items SET restaurant_id = 7, item_name = 'Chicken Manchurian' WHERE id = 14 AND restaurant_id = 1 AND item_name = 'Crispy chicken pieces tossed in spicy Manchurian sauce';
UPDATE food_items SET restaurant_id = 8, item_name = 'Chicken Biryani with Raita' WHERE id = 15 AND restaurant_id = 1 AND item_name = 'Fragrant basmati rice with spiced chicken, served with raita';
UPDATE food_items SET restaurant_id = 8 WHERE id = 16 AND restaurant_id = 1;
UPDATE food_items SET restaurant_id = 9 WHERE id = 17 AND restaurant_id = 2;
UPDATE food_items SET restaurant_id = 9, item_name = 'Grilled Chicken Sandwich' WHERE id = 18 AND restaurant_id = 9 AND item_name = 'Grilled chicken with fresh veggies and mayo';
UPDATE food_items SET restaurant_id = 10, item_name = 'Chicken Wrap' WHERE id = 19 AND restaurant_id = 1 AND item_name = 'Grilled chicken wrapped in soft flatbread with sauces';
UPDATE food_items SET restaurant_id = 10, item_name = 'Falafel Wrap' WHERE id = 20 AND restaurant_id = 10 AND item_name = 'Crispy falafel with fresh veggies and hummus';
UPDATE food_items SET restaurant_id = 11, item_name = 'Pesto Pasta' WHERE id = 21 AND restaurant_id = 1 AND item_name = 'Freshly made pasta with basil pesto sauce';
UPDATE food_items SET restaurant_id = 11, item_name = 'Chicken Alfredo Pasta' WHERE id = 22 AND restaurant_id = 1 AND item_name = 'Creamy Alfredo sauce with grilled chicken and pasta';
UPDATE food_items SET restaurant_id = 12, item_name = 'Chocolate Ice Cream' WHERE id = 23 AND restaurant_id = 11 AND item_name = 'Rich chocolate ice cream with toppings';
UPDATE food_items SET restaurant_id = 12, item_name = 'Vanilla Ice Cream' WHERE id = 24 AND restaurant_id = 4 AND item_name = 'Creamy vanilla ice cream served cold';
UPDATE food_items SET restaurant_id = 1, item_name = 'Paneer Quinoa Bowl' WHERE id = 25 AND restaurant_id = 3 AND item_name = 'A nutritious bowl of grilled paneer, quinoa, and fresh veggies with tangy dressing.';
UPDATE food_items SET restaurant_id = 1, item_name = 'Quinoa Avocado Salad' WHERE id = 26 AND restaurant_id = 10 AND item_name = 'Fresh quinoa tossed with avocado, cherry tomatoes, and lime dressing';
UPDATE food_items SET restaurant_id = 1, item_name = 'Grilled Chicken Bowl' WHERE id = 27 AND restaurant_id = 7 AND item_name = 'Grilled chicken served with brown rice, sautéed greens, and sesame dressing';
UPDATE food_items SET restaurant_id = 2, item_name = 'Veggie Pizza' WHERE id = 28 AND restaurant_id = 12 AND item_name = 'Loaded with fresh vegetables like capsicum, tomato, onion, and mushrooms on a cheesy base';
UPDATE food_items SET restaurant_id = 2, item_name = 'BBQ Chicken Pizza' WHERE id = 29 AND restaurant_id = 9 AND item_name = 'Tender chicken pieces, BBQ sauce, and cheese baked to perfection';
UPDATE food_items SET restaurant_id = 3, item_name = 'Dal Makhani' WHERE id = 30 AND restaurant_id = 12 AND item_name = 'Slow-cooked black lentils in creamy buttery sauce with Indian spices';
UPDATE food_items SET restaurant_id = 3, item_name = 'Kashmiri Mutton Curry' WHERE id = 31 AND restaurant_id = 5 AND item_name = 'Tender mutton cooked in a flavorful Kashmiri gravy with aromatic spices';
UPDATE food_items SET restaurant_id = 4, item_name = 'Crispy Chicken Burger' WHERE id = 32 AND restaurant_id = 12 AND item_name = 'Golden-fried chicken patty with spicy mayo and lettuce in a toasted bun';
UPDATE food_items SET restaurant_id = 4, item_name = 'Chocolate Milkshake' WHERE id = 33 AND restaurant_id = 3 AND item_name = 'Rich and creamy chocolate milkshake topped with whipped cream';
UPDATE food_items SET restaurant_id = 5, item_name = 'Idli Vada' WHERE id = 35 AND restaurant_id = 11 AND item_name = 'Soft idlis and crispy medu vadas served with sambar and coconut chutney';
UPDATE food_items SET restaurant_id = 5, item_name = 'Ghee Roast Dosa' WHERE id = 36 AND restaurant_id = 3 AND item_name = 'Golden crispy dosa roasted with pure ghee, served with sambar and chutneys';
UPDATE food_items SET restaurant_id = 8, item_name = 'Mutton Biryani' WHERE id = 37 AND restaurant_id = 8 AND item_name = 'Tender mutton pieces cooked with aromatic spices and saffron-infused basmati rice';
UPDATE food_items SET restaurant_id = 6, item_name = 'Chicken Dum Biryani' WHERE id = 38 AND restaurant_id = 10 AND item_name = 'Fragrant basmati rice layered with marinated chicken and slow-cooked to perfection in dum style';
UPDATE food_items SET restaurant_id = 7, item_name = 'Chicken Schezwan Noodles' WHERE id = 40 AND restaurant_id = 8 AND item_name = 'Spicy noodles tossed with chicken, bell peppers, and fiery Schezwan sauce';
UPDATE food_items SET restaurant_id = 7, item_name = 'Veg Momos' WHERE id = 41 AND restaurant_id = 3 AND item_name = 'Soft dumplings stuffed with cabbage, carrots, and herbs served with spicy chutney';
UPDATE food_items SET restaurant_id = 8, item_name = 'Egg Biryani' WHERE id = 42 AND restaurant_id = 12 AND item_name = 'Spiced basmati rice cooked with boiled eggs and traditional Hyderabadi masala';
UPDATE food_items SET restaurant_id = 8, item_name = 'Paneer Pulao' WHERE id = 43 AND restaurant_id = 10 AND item_name = 'Aromatic rice cooked with cubes of spiced paneer and mixed vegetables';
UPDATE food_items SET restaurant_id = 9, item_name = 'Chocolate Chip Muffin' WHERE id = 44 AND restaurant_id = 11 AND item_name = 'Soft and moist chocolate muffin with chocolate chips';
UPDATE food_items SET restaurant_id = 9, item_name = 'Espresso' WHERE id = 45 AND restaurant_id = 4 AND item_name = 'Strong, rich shot of freshly brewed espresso';
UPDATE food_items SET restaurant_id = 10, item_name = 'Mutton Seekh Kebab Roll', image_url = 'https://thumbs.dreamstime.com/b/artisan-chicken-shawarma-burrito-grilled-vegetables-delicious-served-bed-fresh-parsley-366381769.jpg' WHERE id = 47 AND restaurant_id = 6 AND item_name = 'Succulent mutton seekh kebabs wrapped in soft flatbread with tangy sauce';
UPDATE food_items SET restaurant_id = 11, item_name = 'Seafood Pasta' WHERE id = 48 AND restaurant_id = 7 AND item_name = 'Pasta with a mix of shrimp, calamari, and mussels in garlic cream sauce';
UPDATE food_items SET restaurant_id = 11, item_name = 'Creamy Mushroom Penne' WHERE id = 49 AND restaurant_id = 12 AND item_name = 'Penne pasta in creamy white sauce with sautéed mushrooms and herbs';
UPDATE food_items SET restaurant_id = 12, item_name = 'Oreo Milkshake' WHERE id = 50 AND restaurant_id = 11 AND item_name = 'Cold and creamy milkshake blended with Oreo cookies and chocolate syrup';
UPDATE food_items SET restaurant_id = 12, item_name = 'Gulab Jamun' WHERE id = 51 AND restaurant_id = 11 AND item_name = 'Soft, syrup-soaked sweet dumplings served warm';

-- Remove the exact duplicate (item 46 of item 14).
DELETE d FROM food_items AS d
  JOIN food_items AS k ON k.id = 14 AND k.price = d.price AND k.image_url = d.image_url
WHERE d.id = 46
  AND d.item_name IN ('Crispy chicken pieces tossed in spicy Manchurian sauce', 'Chicken Manchurian')
  AND d.restaurant_id IN (8, 7)
  AND NOT EXISTS (SELECT 1 FROM foodvilla_orderService.order_items o WHERE o.food_item_id = 46);

COMMIT;
