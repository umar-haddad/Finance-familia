import { CURRENCIES } from "@/constants/finance";

export function formatAmountInput(value: string, currencyCode = "IDR"): string {
  if (currencyCode !== "IDR") {
    return value.replace(/[^\d.,]/g, "");
  }

  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseAmountInput(value: string, currencyCode = "IDR"): number {
  if (currencyCode === "IDR") {
    return Number(value.replace(/\D/g, ""));
  }

  return Number(value.replace(",", "."));
}

export function formatCurrency(amount: number, currencyCode = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: currencyCode === "IDR" ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function currencySymbol(currencyCode: string): string {
  return (
    CURRENCIES.find((currency) => currency.code === currencyCode)?.symbol ??
    currencyCode
  );
}
