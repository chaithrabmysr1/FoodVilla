import React, { useState } from "react";
import {
  FaChevronLeft,
  FaCheck,
  FaCreditCard,
  FaLock,
  FaMobileAlt,
  FaPaypal,
  FaUniversity,
} from "react-icons/fa";
import { SiPaytm, SiRazorpay } from "react-icons/si";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import "../styles/Payment.css";

// Which payment options exist, and which of them are real.
//
//  - "razorpay", "upi" and "card" are all REAL: each opens Razorpay's own
//    Checkout in TEST MODE (UPI and card just limit it to that method). The
//    card/UPI details are entered inside Razorpay's checkout, never in a form
//    built here.
//  - Net Banking, Paytm and PayPal have no integration behind them. They are
//    shown disabled and marked "Coming soon": no handler, no API call, no fake
//    success.
const GROUPS = [
  {
    title: "Pay with Razorpay",
    note: "Real Razorpay Checkout in TEST mode",
    methods: [
      {
        id: "razorpay",
        name: "Razorpay",
        detail: "UPI, cards, net banking and wallets in one secure checkout",
        Icon: SiRazorpay,
        recommended: true,
      },
      { id: "upi", name: "UPI", detail: "Pay with any UPI app or a UPI ID", Icon: FaMobileAlt },
      {
        id: "card",
        name: "Credit / Debit Card",
        detail: "Enter your card in Razorpay's secure test checkout",
        Icon: FaCreditCard,
      },
    ],
  },
  {
    title: "More ways to pay",
    note: null,
    methods: [
      { id: "netbanking", name: "Net Banking", detail: "Direct bank integration", Icon: FaUniversity, soon: true },
      { id: "paytm", name: "Paytm", detail: "Paytm wallet and UPI", Icon: SiPaytm, soon: true },
      { id: "paypal", name: "PayPal", detail: "Pay with your PayPal account", Icon: FaPaypal, soon: true },
    ],
  },
];

const PHASES = {
  creating: {
    cta: "Preparing payment...",
    overlay: "Preparing your secure Razorpay checkout…",
  },
  paying: {
    cta: "Waiting for payment...",
    overlay: "Razorpay checkout is open — complete the payment there.",
  },
  verifying: {
    cta: "Confirming your payment...",
    overlay: "Payment received. Confirming it with FoodVilla — please don't close this page.",
  },
};

// Step 2 of checkout. Nothing is created and nothing opens until the customer
// picks a method and presses Pay; then Razorpay Checkout (test mode) opens.
const PaymentMethods = ({
  quote,
  cartItems,
  razorpayAvailable,
  razorpayUnavailableReason,
  retrying,
  phase,
  onPay,
  onBack,
  children,
}) => {
  const [selected, setSelected] = useState("razorpay");
  const busy = phase !== "idle";
  const amount = quote?.finalAmount;
  const canPay = !busy && razorpayAvailable && quote != null;

  return (
    <div className="pm-page">
      <button type="button" className="pm-back" onClick={onBack} disabled={busy}>
        <FaChevronLeft aria-hidden="true" /> Back to checkout
      </button>
      <h2 className="pm-title">Choose Payment Method</h2>
      <p className="pm-subtitle">
        Select how you&apos;d like to pay. This is a demo: payments run in Razorpay <strong>TEST mode</strong>{" "}
        and no real money is ever charged.
      </p>

      <div className="pm-layout">
        <div className="pm-main">
          <section className="pm-card pm-amount" aria-label="Amount to pay">
            <div>
              <p className="pm-amount-label">Amount to pay</p>
              <p className="pm-amount-value">{quote ? money(amount) : "—"}</p>
            </div>
            <span className="pm-testpill">TEST MODE</span>
          </section>

          {children}

          <section className="pm-card pm-methods" aria-busy={busy}>
            {GROUPS.map((group) => (
              <div className="pm-group" key={group.title}>
                <div className="pm-group-head">
                  <h3>{group.title}</h3>
                  {group.note && <span>{group.note}</span>}
                </div>
                <div className="pm-options" role="radiogroup" aria-label={group.title}>
                  {group.methods.map((method) => {
                    const { id, name, detail, soon, recommended } = method;
                    const MethodIcon = method.Icon;
                    const isSelected = !soon && selected === id;
                    const unavailable = !soon && !razorpayAvailable;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`pm-method${isSelected ? " selected" : ""}${soon ? " soon" : ""}${
                          unavailable ? " unavailable" : ""
                        }`}
                        disabled={soon || unavailable || busy}
                        onClick={() => setSelected(id)}
                      >
                        <span className="pm-method-icon" aria-hidden="true">
                          <MethodIcon />
                        </span>
                        <span className="pm-method-text">
                          <span className="pm-method-name">
                            {name}
                            {recommended && <em className="pm-tag">Recommended</em>}
                          </span>
                          <span className="pm-method-detail">
                            {unavailable ? razorpayUnavailableReason || "Not available right now" : detail}
                          </span>
                        </span>
                        {soon ? (
                          <span className="pm-badge soon">Coming soon</span>
                        ) : (
                          <span className="pm-radio" aria-hidden="true">
                            {isSelected && <FaCheck />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {busy && (
              <div className="pm-processing" role="status" aria-live="polite">
                <span className="pm-spinner large" aria-hidden="true" />
                <p>{PHASES[phase].overlay}</p>
              </div>
            )}
          </section>

          <details className="pm-help">
            <summary>Razorpay test payment details</summary>
            <ul>
              <li>
                <strong>Card:</strong> <code>4111 1111 1111 1111</code>, any future expiry, any CVV and any
                name.
              </li>
              <li>
                <strong>UPI:</strong> <code>success@razorpay</code> succeeds, <code>failure@razorpay</code>{" "}
                fails.
              </li>
              <li>
                Razorpay&apos;s test checkout shows exactly what it needs (including an OTP or PIN step where
                its test flow asks for one). Values can change — see Razorpay&apos;s official test-payment
                docs.
              </li>
            </ul>
          </details>
        </div>

        <aside className="pm-card pm-summary" aria-label="Order summary">
          <h3>Order summary</h3>
          <ul className="pm-items">
            {cartItems.map((item) => (
              <li key={item.id}>
                <img
                  src={item.imageUrl || FOOD_PLACEHOLDER}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FOOD_PLACEHOLDER;
                  }}
                />
                <span className="pm-item-name">
                  {item.itemName}
                  <small>
                    {money(item.price)} × {item.quantity}
                  </small>
                </span>
                <span className="pm-item-total">{money(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          {quote && (
            <div className="pm-bill">
              <div>
                <span>Item total</span>
                <span>{money(quote.subtotalAmount)}</span>
              </div>
              <div>
                <span>Delivery fee</span>
                <span>{money(quote.deliveryFee)}</span>
              </div>
              <div>
                <span>Taxes</span>
                <span>{money(quote.taxAmount)}</span>
              </div>
              <div className={Number(quote.discountAmount) > 0 ? "discount" : ""}>
                <span>Discount</span>
                <span>
                  {Number(quote.discountAmount) > 0 ? `-${money(quote.discountAmount)}` : money(0)}
                </span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>{money(quote.finalAmount)}</span>
              </div>
            </div>
          )}

          {retrying && !busy && (
            <p className="pm-retry">Your order is saved and waiting for payment.</p>
          )}

          <button type="button" className="pm-cta" disabled={!canPay} onClick={() => onPay(selected)}>
            {busy ? (
              <>
                <span className="pm-spinner" aria-hidden="true" />
                {PHASES[phase].cta}
              </>
            ) : (
              <>
                <FaLock aria-hidden="true" />
                Pay {quote ? money(amount) : ""}
              </>
            )}
          </button>
          <p className="pm-secure">
            <span className="pm-testpill small">TEST MODE</span> Razorpay test payments only — no real money is
            charged.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default PaymentMethods;
