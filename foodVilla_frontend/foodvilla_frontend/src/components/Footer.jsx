    import React from "react";
    import "../styles/Footer.css"; // CSS file for footer styles

    const Footer = () => {
      return (
        <footer className="app-footer">
          <div className="footer-columns">
            {/* About Column */}
            <div className="footer-column">
              <h4>About Us</h4>
              <p>FoodVilla is your favorite platform for quick and tasty meals from top restaurants in your city.</p>
            </div>

            {/* Help Column */}
            <div className="footer-column">
              <h4>Help</h4>
              <ul>
                <li><a href="/help" className="footer-link">Support</a></li>
                <li><a href="/terms" className="footer-link">Terms & Conditions</a></li>
                <li><a href="/privacy" className="footer-link">Privacy Policy</a></li>
              </ul>
            </div>

            {/* Social Column */}
            <div className="footer-column">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="footer-link">Facebook</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="footer-link">Twitter</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="footer-link">Instagram</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            © 2025 FoodVilla. All rights reserved.
          </div>
        </footer>
      );
    };

    export default Footer;
