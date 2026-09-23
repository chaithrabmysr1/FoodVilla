import { colors } from "./colors";

export const typography = {
  h1: { fontSize: 26, fontWeight: "700" as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 14, fontWeight: "400" as const, color: colors.text },
  bodyMuted: { fontSize: 13, fontWeight: "400" as const, color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: "400" as const, color: colors.textLight },
  button: { fontSize: 15, fontWeight: "700" as const, color: colors.surface },
};
