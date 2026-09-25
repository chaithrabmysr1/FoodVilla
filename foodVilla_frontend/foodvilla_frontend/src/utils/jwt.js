// Reads the claims out of the JWT the app already keeps in localStorage.
// This is for UI convenience only (scoping saved checkout state to the current
// user, prefilling Razorpay's form) — the backend never trusts anything the
// browser decodes; it validates the token's signature on every request.
export const tokenClaims = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return {};
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
};
