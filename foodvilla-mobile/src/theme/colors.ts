// Mirrors the web app's palette (src/styles/*.css) so the two feel like the
// same product rather than two different apps skinned differently.
export const colors = {
  primary: "#ff6600",
  primaryDark: "#e55a00",
  success: "#28a745",
  danger: "#ff3b30",
  warning: "#b8860b",
  background: "#f7f7f7",
  surface: "#ffffff",
  text: "#222222",
  textMuted: "#666666",
  textLight: "#999999",
  border: "#eeeeee",
  overlay: "rgba(0,0,0,0.4)",
};

export type ColorName = keyof typeof colors;
