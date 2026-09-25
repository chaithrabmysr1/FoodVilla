-- Runs once, automatically, the first time the mysql container initializes
-- an empty data directory (standard MySQL image behavior for anything in
-- /docker-entrypoint-initdb.d). Creates the same four schemas each service
-- already expects (see each service's application.yml DB_URL default) —
-- one MySQL instance, database-per-service ownership preserved at the
-- logical/schema level rather than spinning up four separate containers.
--
-- The former payment/delivery/notification schemas are intentionally no longer
-- created here. An existing MySQL volume keeps them untouched; see
-- REMOVED_SERVICES.md for how to clean them up manually.
CREATE DATABASE IF NOT EXISTS foodvilla_userService;
CREATE DATABASE IF NOT EXISTS foodvilla_restaurantService;
CREATE DATABASE IF NOT EXISTS foodvilla_foodCatalogueService;
CREATE DATABASE IF NOT EXISTS foodvilla_orderService;
