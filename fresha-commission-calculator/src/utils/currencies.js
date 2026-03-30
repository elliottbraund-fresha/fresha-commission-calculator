export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0 },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79 },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.55 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.80 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 150.0 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.31 },
];

export function fmt(v, decimals = 0) {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  return "$" + Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtLocal(v, code, rate, decimals = 0) {
  if (code === "USD") return "";
  const converted = v * rate;
  return `${code} ${Number(converted).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function pct(v) {
  return `${Number(v).toFixed(1)}%`;
}
