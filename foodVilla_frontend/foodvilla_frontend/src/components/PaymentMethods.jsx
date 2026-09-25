import React, { useState } from "react";
import {
  FaChevronLeft,
  FaCheck,
  FaCheckCircle,
  FaCreditCard,
  FaInfoCircle,
  FaLock,
  FaMobileAlt,
  FaPaypal,
  FaUniversity,
} from "react-icons/fa";
import { SiPaytm } from "react-icons/si";
import { FOOD_PLACEHOLDER, money } from "../utils/format";
import {
  EMPTY_VALUES,
  FIELDS_BY_METHOD,
  OTHER_BANKS,
  POPULAR_BANKS,
  cardBrand,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  formatMobile,
  summarizePayment,
  validatePayment,
} from "../utils/paymentDetails";
import "../styles/Payment.css";

// Every method asks for its own dummy details; nothing typed here leaves the
// browser except a masked label (see summarizePayment). Payment itself is
// simulated by the backend — no real money moves.
const METHODS = [
  { id: "UPI", name: "UPI", detail: "Pay using your UPI ID", Icon: FaMobileAlt },
  {
    id: "CARD",
    name: "Credit / Debit Card",
    detail: "Visa, Mastercard, RuPay and American Express",
    Icon: FaCreditCard,
  },
  { id: "NETBANKING", name: "Net Banking", detail: "Pay from your bank account", Icon: FaUniversity },
  { id: "PAYTM", name: "Paytm", detail: "Pay with your Paytm account", Icon: SiPaytm },
  { id: "PAYPAL", name: "PayPal", detail: "Pay with your PayPal account", Icon: FaPaypal },
];

const PHASES = {
  creating: { cta: "Placing your order...", overlay: "Placing your order…" },
  processing: {
    cta: "Processing payment...",
    overlay: "Processing your payment. Please don't close or refresh this page.",
  },
  success: { cta: "Payment successful", overlay: "Payment successful!" },
};

const Field = ({ id, label, error, hint, className = "", children }) => (
  <div className={`pm-field ${className}${error ? " invalid" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {error ? (
      <p className="pm-field-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    ) : (
      hint && (
        <p className="pm-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )
    )}
  </div>
);

// Step 2 of checkout (and "Pay now" on an unpaid order). Pick a method, fill in
// its dummy details, press Pay. The button is always clickable: an incomplete
// form is answered with what to fix, not with a dead button.
const PaymentMethods = ({
  quote,
  cartItems,
  retrying,
  phase,
  error,
  onPay,
  onBack,
}) => {
  const [selected, setSelected] = useState("UPI");
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const busy = phase !== "idle";
  const amount = quote?.finalAmount;

  const withoutError = (current, name) => {
    const next = { ...current };
    delete next[name];
    return next;
  };

  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? withoutError(current, name) : current));
  };

  const selectMethod = (id) => {
    setSelected(id);
    setErrors({});
  };

  // Tell the customer about a field as soon as they leave it.
  const checkField = (name) => {
    const problem = validatePayment(selected, values)[name];
    setErrors((current) =>
      problem ? { ...current, [name]: problem } : withoutError(current, name)
    );
  };

  const bind = (name, format = (value) => value) => ({
    id: `pm-${name}`,
    value: values[name],
    onChange: (e) => setField(name, format(e.target.value)),
    onBlur: () => checkField(name),
    disabled: busy,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `pm-${name}-error` : undefined,
  });

  const submit = (e) => {
    e.preventDefault();
    if (busy || !quote) return;

    const found = validatePayment(selected, values);
    setErrors(found);
    const firstInvalid = FIELDS_BY_METHOD[selected].find((name) => found[name]);
    if (firstInvalid) {
      document.getElementById(`pm-${firstInvalid}`)?.focus();
      return;
    }
    onPay({ method: selected, detail: summarizePayment(selected, values) });
  };

  const brand = cardBrand(values.cardNumber);

  const forms = {
    UPI: (
      <Field id="pm-upiId" label="UPI ID" error={errors.upiId} hint="The UPI ID linked to your bank account.">
        <input
          {...bind("upiId")}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@okhdfcbank"
        />
      </Field>
    ),

    CARD: (
      <>
        <Field id="pm-cardNumber" label="Card number" error={errors.cardNumber}>
          <div className="pm-input-wrap">
            <input
              {...bind("cardNumber", formatCardNumber)}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1234 5678 9012 3456"
            />
            {brand && <span className="pm-brand">{brand}</span>}
          </div>
        </Field>
        <Field id="pm-cardName" label="Name on card" error={errors.cardName}>
          <input {...bind("cardName")} type="text" autoComplete="off" placeholder="Name as printed on the card" />
        </Field>
        <div className="pm-row">
          <Field id="pm-cardExpiry" label="Expiry" error={errors.cardExpiry}>
            <input
              {...bind("cardExpiry", formatExpiry)}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/YY"
            />
          </Field>
          <Field id="pm-cardCvv" label="CVV" error={errors.cardCvv}>
            <input
              {...bind("cardCvv", formatCvv)}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
            />
          </Field>
        </div>
      </>
    ),

    NETBANKING: (
      <div className={`pm-field${errors.bank ? " invalid" : ""}`}>
        <span className="pm-field-label" id="pm-bank-label">
          Select your bank
        </span>
        <div className="pm-banks" role="radiogroup" aria-labelledby="pm-bank-label">
          {POPULAR_BANKS.map((bank) => {
            const active = values.bank === bank.name;
            return (
              <button
                key={bank.name}
                type="button"
                role="radio"
                aria-checked={active}
                className={`pm-bank${active ? " selected" : ""}`}
                disabled={busy}
                onClick={() => setField("bank", bank.name)}
              >
                <span className="pm-bank-mark" aria-hidden="true">
                  {bank.short.charAt(0)}
                </span>
                {bank.name}
              </button>
            );
          })}
        </div>
        <label className="pm-field-label" htmlFor="pm-bank">
          Other banks
        </label>
        <select
          id="pm-bank"
          value={OTHER_BANKS.includes(values.bank) ? values.bank : ""}
          onChange={(e) => e.target.value && setField("bank", e.target.value)}
          disabled={busy}
          aria-invalid={Boolean(errors.bank)}
          aria-describedby={errors.bank ? "pm-bank-error" : undefined}
        >
          <option value="">Select another bank</option>
          {OTHER_BANKS.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>
        {errors.bank && (
          <p className="pm-field-error" id="pm-bank-error" role="alert">
            {errors.bank}
          </p>
        )}
      </div>
    ),

    PAYTM: (
      <Field
        id="pm-paytmMobile"
        label="Paytm mobile number"
        error={errors.paytmMobile}
        hint="The mobile number linked to your Paytm account."
      >
        <div className="pm-input-wrap">
          <span className="pm-prefix">+91</span>
          <input
            {...bind("paytmMobile", formatMobile)}
            className="pm-has-prefix"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="9876543210"
          />
        </div>
      </Field>
    ),

    PAYPAL: (
      <Field
        id="pm-paypalEmail"
        label="PayPal email"
        error={errors.paypalEmail}
        hint="The email address of your PayPal account."
      >
        <input
          {...bind("paypalEmail")}
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
        />
      </Field>
    ),
  };

  return (
    <div className="pm-page">
      <button type="button" className="pm-back" onClick={onBack} disabled={busy}>
        <FaChevronLeft aria-hidden="true" /> Back to checkout
      </button>
      <h2 className="pm-title">Choose Payment Method</h2>
      <p className="pm-subtitle">Select how you&apos;d like to pay and enter your details.</p>
      <div className="pm-demo-notice" role="note">
        <FaInfoCircle aria-hidden="true" />
        <span>
          <strong>Demo payment</strong> — No real money will be charged. Do not enter real card details.
        </span>
      </div>

      <form className="pm-layout" onSubmit={submit} noValidate>
        <div className="pm-main">
          <section className="pm-card pm-amount" aria-label="Amount to pay">
            <div>
              <p className="pm-amount-label">Amount to pay</p>
              <p className="pm-amount-value">{quote ? money(amount) : "—"}</p>
            </div>
          </section>

          <section className="pm-card pm-methods" aria-busy={busy}>
            <div className="pm-group-head">
              <h3>Pay using</h3>
            </div>
            <div className="pm-options" role="radiogroup" aria-label="Payment method">
              {METHODS.map((method) => {
                const { id, name, detail } = method;
                const MethodIcon = method.Icon;
                const isSelected = selected === id;
                return (
                  <div className={`pm-option${isSelected ? " open" : ""}`} key={id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-controls={`pm-form-${id}`}
                      className={`pm-method${isSelected ? " selected" : ""}`}
                      disabled={busy}
                      onClick={() => selectMethod(id)}
                    >
                      <span className="pm-method-icon" aria-hidden="true">
                        <MethodIcon />
                      </span>
                      <span className="pm-method-text">
                        <span className="pm-method-name">{name}</span>
                        <span className="pm-method-detail">{detail}</span>
                      </span>
                      <span className="pm-radio" aria-hidden="true">
                        {isSelected && <FaCheck />}
                      </span>
                    </button>
                    {isSelected && (
                      <div className="pm-form" id={`pm-form-${id}`} role="group" aria-label={`${name} details`}>
                        {forms[id]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {busy && (
              <div className="pm-processing" role="status" aria-live="polite">
                {phase === "success" ? (
                  <FaCheckCircle className="pm-success-icon" aria-hidden="true" />
                ) : (
                  <span className="pm-spinner large" aria-hidden="true" />
                )}
                <p>{PHASES[phase].overlay}</p>
                {phase === "success" && <small>Confirming your order…</small>}
              </div>
            )}
          </section>
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

          {retrying && !busy && !error && (
            <p className="pm-retry">Your order is saved and waiting for payment.</p>
          )}
          {error && (
            <p className="pay-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="pm-cta" disabled={busy || !quote}>
            {busy ? (
              <>
                {phase === "success" ? (
                  <FaCheck aria-hidden="true" />
                ) : (
                  <span className="pm-spinner" aria-hidden="true" />
                )}
                {PHASES[phase].cta}
              </>
            ) : (
              <>
                <FaLock aria-hidden="true" />
                Pay {quote ? money(amount) : ""}
              </>
            )}
          </button>
        </aside>
      </form>
    </div>
  );
};

export default PaymentMethods;
