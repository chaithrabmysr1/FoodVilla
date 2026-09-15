    import React from "react";
    import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

    function App() {
      return (
        <Router>
          <div className="app-container">
            <Header />

            <div className="app-content">
              <Routes>
                <Route path="/" element={<RestaurantList />} />
                <Route path="/restaurant/:id" element={<RestaurantDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/search" element={<Search />} /> {/* ✅ render Search component */}
                <Route path="/help" element={<Help />} />
              </Routes>
            </div>

            <Footer />
          </div>
        </Router>
      );
    }

    export default App;
