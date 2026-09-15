    import React from "react";
    import "../styles/Help.css";

    const faqs = [
      {
        question: "How do I place an order?",
        answer: "Browse restaurants, select your favorite food items, add them to the cart, and checkout."
      },
      {
        question: "How do I track my order?",
        answer: "After placing an order, go to the 'Orders' section to see real-time tracking details."
      },
      {
        question: "What payment methods are available?",
        answer: "You can pay using credit/debit cards, net banking, UPI, or cash on delivery."
      },
      {
        question: "How do I cancel my order?",
        answer: "Go to 'Orders', select the order, and click 'Cancel'. Cancellation policies may vary by restaurant."
      },
      {
        question: "Who can I contact for further support?",
        answer: "You can reach us via the 'Contact Us' section or email support@foodvilla.com."
      },
    ];

    const Help = () => {
      return (
        <div className="help-page">
          <h2>Help & Support</h2>
          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div className="faq-item" key={index}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      );
    };

    export default Help;
