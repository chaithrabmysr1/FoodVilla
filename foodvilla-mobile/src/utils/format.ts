export const formatCurrency = (amount: number): string => `₹${amount.toFixed(0)}`;

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatStatusLabel = (status: string): string =>
  status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
