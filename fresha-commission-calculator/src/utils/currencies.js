export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0 },
  { code: "GBP", name: "British Pound", symbol: "GBP", rate: 0.79 },
  { code: "EUR", name: "Euro", symbol: "EUR", rate: 0.92 },
  { code: "AUD", name: "Australian Dollar", symbol: "AUD", rate: 1.55 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", rate: 3.67 },
  { code: "BRL", name: "Brazilian Real", symbol: "BRL", rate: 5.80 },
  { code: "JPY", name: "Japanese Yen", symbol: "JPY", rate: 150.0 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CAD", rate: 1.36 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", rate: 3.75 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", rate: 0.31 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "IDR", rate: 15800 },
  { code: "SGD", name: "Singapore Dollar", symbol: "SGD", rate: 1.34 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZD", rate: 1.63 },
  { code: "SEK", name: "Swedish Krona", symbol: "SEK", rate: 10.5 },
  { code: "PHP", name: "Philippine Peso", symbol: "PHP", rate: 56.0 },
  { code: "ZAR", name: "South African Rand", symbol: "ZAR", rate: 18.5 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "MYR", rate: 4.45 },
];

export function fmt(v, decimals = 0) {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  return "$" + Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getCurrencySymbol(code) {
  return code;
}

export function fmtLocal(v, code, rate, decimals = 0) {
  if (code === "USD") return "";
  const converted = v * rate;
  return `${code} ${Number(converted).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtCurrency(v, code, decimals = 0) {
  return `${code} ${Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function pct(v) {
  return `${Number(v).toFixed(1)}%`;
}
