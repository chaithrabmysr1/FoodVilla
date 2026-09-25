    import React from "react";
    import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
    import Header from "./components/Header";
    import RestaurantList from "./components/RestaurantList";
    import RestaurantDetails from "./components/RestaurantDetails";
    import Cart from "./components/Cart";
    import Checkout from "./components/Checkout";
    import Footer from "./components/Footer";
    import './App.css';
    import Signup from "./components/Signup";
    import Login from "./components/Login";
    import Help from "./components/Help";
    import Search from "./components/Search"; // ✅ import Search component
    import OrderHistory from "./components/OrderHistory";
    import OrderDetails from "./components/OrderDetails";
    import ProtectedRoute from "./components/ProtectedRoute";
    import { AuthProvider } from "./context/AuthContext";
    import AdminLayout from "./components/admin/AdminLayout";
    import AdminRestaurants from "./components/admin/AdminRestaurants";
    import AdminFoodItems from "./components/admin/AdminFoodItems";
    import AdminOrders from "./components/admin/AdminOrders";
    import AdminOrderDetail from "./components/admin/AdminOrderDetail";
    import AdminUsers from "./components/admin/AdminUsers";

    function App() {
      return (
        <AuthProvider>
          <Router>
            <div className="app-container">
              <Header />

              <div className="app-content">
                <Routes>
                  <Route path="/" element={<RestaurantList />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/search" element={<Search />} /> {/* ✅ render Search component */}
                  <Route path="/help" element={<Help />} />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <OrderHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute>
                        <OrderDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="restaurants" replace />} />
                    <Route path="restaurants" element={<AdminRestaurants />} />
                    <Route path="food-items" element={<AdminFoodItems />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="orders/:id" element={<AdminOrderDetail />} />
                    <Route path="users" element={<AdminUsers />} />
                  </Route>
                </Routes>
              </div>

              <Footer />
            </div>
          </Router>
        </AuthProvider>
      );
    }

    export default App;
