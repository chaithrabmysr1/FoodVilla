    import React from "react";
    import {
      FaChevronDown,
      FaCreditCard,
      FaEnvelope,
      FaHeadset,
      FaSearchLocation,
      FaShoppingBag,
      FaTimesCircle,
    } from "react-icons/fa";
    import "../styles/Help.css";

    const faqs = [
      {
        icon: FaShoppingBag,
        question: "How do I place an order?",
        answer: "Browse restaurants, select your favorite food items, add them to the cart, and checkout."
      },
      {
        icon: FaSearchLocation,
        question: "How do I track my order?",
        answer: "After placing an order, go to the 'Orders' section to see real-time tracking details."
      },
      {
        icon: FaCreditCard,
        question: "What payment methods are available?",
        answer: "You can pay with UPI, a credit or debit card, net banking, Paytm or PayPal. Pick a method at checkout, enter your details and your order is confirmed right away. Cash on delivery is not available."
      },
      {
        icon: FaTimesCircle,
        question: "How do I cancel my order?",
        answer: "Go to 'Orders', select the order, and click 'Cancel'. Cancellation policies may vary by restaurant."
      },
      {
        icon: FaHeadset,
        question: "Who can I contact for further support?",
        answer: "You can reach us via the 'Contact Us' section or email support@foodvilla.com."
      },
    ];

    const Help = () => {
      return (
        <main className="hp-page">
          <div className="hp-wrap">
            <header className="hp-hero">
              <span className="hp-hero-icon" aria-hidden="true">
                <FaHeadset />
              </span>
              <h1 className="hp-title">Help &amp; Support</h1>
              <p className="hp-sub">Quick answers to the questions we hear most.</p>
            </header>

            <section className="hp-faq" aria-label="Frequently asked questions">
              {faqs.map((faq, index) => {
                const Icon = faq.icon;
                return (
                  <details className="hp-item" key={faq.question} open={index === 0}>
                    <summary className="hp-q">
                      <span className="hp-q-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="hp-q-text">{faq.question}</span>
                      <FaChevronDown className="hp-chevron" aria-hidden="true" />
                    </summary>
                    <p className="hp-a">{faq.answer}</p>
                  </details>
                );
              })}
            </section>

            <aside className="hp-contact">
              <div className="hp-contact-text">
                <h2>Still need help?</h2>
                <p>Can't find your answer? Drop us an email and we'll get back to you.</p>
              </div>
              <a className="hp-contact-btn" href="mailto:support@foodvilla.com">
                <FaEnvelope aria-hidden="true" />
                support@foodvilla.com
              </a>
            </aside>
          </div>
        </main>
      );
    };

    export default Help;
