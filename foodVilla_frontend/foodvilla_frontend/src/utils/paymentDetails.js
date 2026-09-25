// The dummy payment forms: what each method asks for, whether what was typed
// looks right, and the masked label that goes on the receipt.
//
// Nothing typed here ever leaves the browser except the masked label from
// summarizePayment() — a full card number, expiry or CVV is never sent or stored.

export const METHOD_IDS = ["UPI", "CARD", "NETBANKING", "PAYTM", "PAYPAL"];

export const POPULAR_BANKS = [
  { name: "State Bank of India", short: "SBI" },
  { name: "HDFC Bank", short: "HDFC" },
  { name: "ICICI Bank", short: "ICICI" },
  { name: "Axis Bank", short: "Axis" },
  { name: "Kotak Mahindra Bank", short: "Kotak" },
  { name: "Punjab National Bank", short: "PNB" },
];

export const OTHER_BANKS = [
  "Bank of Baroda",
  "Canara Bank",
  "IDFC FIRST Bank",
  "IndusInd Bank",
  "Union Bank of India",
  "Yes Bank",
];

export const EMPTY_VALUES = {
  upiId: "",
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvv: "",
  bank: "",
  paytmMobile: "",
  paypalEmail: "",
};

// The first field of each method's form, so a failed submit can focus it.
export const FIELDS_BY_METHOD = {
  UPI: ["upiId"],
  CARD: ["cardNumber", "cardName", "cardExpiry", "cardCvv"],
  NETBANKING: ["bank"],
  PAYTM: ["paytmMobile"],
  PAYPAL: ["paypalEmail"],
};

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

// ---- card -----------------------------------------------------------------

export const cardBrand = (number) => {
  const digits = digitsOnly(number);
  if (/^4/.test(digits)) return "Visa";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(digits)) return "Mastercard";
  if (/^(60|65|81|82|508)/.test(digits)) return "RuPay";
  return null;
};

const cardLength = (number) => (cardBrand(number) === "Amex" ? 15 : 16);

// "4111111111111111" -> "4111 1111 1111 1111" (Amex groups as 4-6-5).
export const formatCardNumber = (raw) => {
  const digits = digitsOnly(raw).slice(0, cardLength(raw));
  if (cardBrand(digits) === "Amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter(Boolean).join(" ");
  }
  return digits.replace(/(.{4})(?=.)/g, "$1 ");
};

// Typing "1225" gives "12/25"; a first digit of 2-9 can only be a month, so it
// becomes "0" + that digit.
export const formatExpiry = (raw) => {
  let digits = digitsOnly(raw).slice(0, 4);
  if (/^[2-9]/.test(digits)) digits = `0${digits}`.slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const formatMobile = (raw) => digitsOnly(raw).slice(0, 10);

export const formatCvv = (raw) => digitsOnly(raw).slice(0, 4);

// ---- validation -----------------------------------------------------------

const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,49}$/;

// Returns { fieldName: "message" } for the chosen method only; {} means valid.
// `now` is injectable so expiry checks are testable.
export const validatePayment = (method, values, now = new Date()) => {
  const errors = {};

  switch (method) {
    case "UPI":
      if (!UPI_PATTERN.test(values.upiId.trim())) {
        errors.upiId = "Enter a valid UPI ID, like name@okhdfcbank.";
      }
      break;

    case "CARD": {
      const number = digitsOnly(values.cardNumber);
      if (number.length !== cardLength(number)) {
        errors.cardNumber = "Enter your full card number.";
      }
      if (!NAME_PATTERN.test(values.cardName.trim())) {
        errors.cardName = "Enter the name on your card.";
      }
      const expiry = /^(\d{2})\/(\d{2})$/.exec(values.cardExpiry);
      if (!expiry || Number(expiry[1]) < 1 || Number(expiry[1]) > 12) {
        errors.cardExpiry = "Enter the expiry as MM/YY.";
      } else {
        const year = 2000 + Number(expiry[2]);
        const month = Number(expiry[1]);
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth() + 1;
        if (year < thisYear || (year === thisYear && month < thisMonth)) {
          errors.cardExpiry = "This card has expired.";
        } else if (year > thisYear + 20) {
          errors.cardExpiry = "Enter the expiry as MM/YY.";
        }
      }
      const cvvLength = cardBrand(number) === "Amex" ? 4 : 3;
      if (digitsOnly(values.cardCvv).length !== cvvLength) {
        errors.cardCvv = `Enter the ${cvvLength}-digit CVV.`;
      }
      break;
    }

    case "NETBANKING":
      if (!values.bank) {
        errors.bank = "Select your bank.";
      }
      break;

    case "PAYTM":
      if (!/^[6-9]\d{9}$/.test(values.paytmMobile)) {
        errors.paytmMobile = "Enter the 10-digit mobile number linked to your Paytm account.";
      }
      break;

    case "PAYPAL":
      if (!EMAIL_PATTERN.test(values.paypalEmail.trim())) {
        errors.paypalEmail = "Enter the email address of your PayPal account.";
      }
      break;

    default:
      break;
  }

  return errors;
};

// ---- receipt label --------------------------------------------------------

// "asha.rao@gmail.com" -> "as•••@gmail.com"; "ab@ybl" -> "a•••@ybl".
const maskHandle = (value) => {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return trimmed;
  const local = trimmed.slice(0, at);
  return `${local.slice(0, local.length > 2 ? 2 : 1)}•••${trimmed.slice(at)}`;
};

// The one thing sent to the server about how the customer paid.
export const summarizePayment = (method, values) => {
  switch (method) {
    case "UPI":
      return maskHandle(values.upiId);
    case "CARD":
      return `${cardBrand(values.cardNumber) || "Card"} •••• ${digitsOnly(values.cardNumber).slice(-4)}`;
    case "NETBANKING":
      return values.bank;
    case "PAYTM":
      return `+91 ••••••${values.paytmMobile.slice(-4)}`;
    case "PAYPAL":
      return maskHandle(values.paypalEmail);
    default:
      return "";
  }
};
