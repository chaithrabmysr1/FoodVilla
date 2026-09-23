-- Runs once, automatically, the first time the mysql container initializes
-- an empty data directory (standard MySQL image behavior for anything in
-- /docker-entrypoint-initdb.d). Creates the same seven schemas each service
-- already expects (see each service's application.yml DB_URL default) —
-- one MySQL instance, database-per-service ownership preserved at the
-- logical/schema level rather than spinning up seven separate containers.
CREATE DATABASE IF NOT EXISTS foodvilla_userService;
CREATE DATABASE IF NOT EXISTS foodvilla_restaurantService;
CREATE DATABASE IF NOT EXISTS foodvilla_foodCatalogueService;
CREATE DATABASE IF NOT EXISTS foodvilla_orderService;
CREATE DATABASE IF NOT EXISTS foodvilla_paymentService;
CREATE DATABASE IF NOT EXISTS foodvilla_deliveryService;
CREATE DATABASE IF NOT EXISTS foodvilla_notificationService;
