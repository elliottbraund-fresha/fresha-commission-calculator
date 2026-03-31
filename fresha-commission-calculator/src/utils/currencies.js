export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0 },
  { code: "GBP", name: "British Pound", symbol: "Â£", rate: 0.79 },
  { code: "EUR", name: "Euro", symbol: "â¬", rate: 0.92 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.55 },
  { code: "AED", name: "UAE Dirham", symbol: "Ø¯.Ø¥", rate: 3.67 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.80 },
  { code: "JPY", name: "Japanese Yen", symbol: "Â¥", rate: 150.0 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36 },
  { code: "SAR", name: "Saudi Riyal", symbol: "ï·¼", rate: 3.75 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "Ø¯.Ù", rate: 0.31 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 15800 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.34 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", rate: 1.63 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", rate: 10.5 },
  { code: "PHP", name: "Philippine Peso", symbol: "â±", rate: 56.0 },
  { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.5 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 4.45 },
];

export function fmt(v, decimals = 0) {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  return "$" + Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getCurrencySymbol(code) {
  const c = CURRENCIES.find(cur => cur.code === code);
  return c ? c.symbol : code;
}

export function fmtLocal(v, code, rate, decimals = 0) {
  if (code === "USD") return "";
  const converted = v * rate;
  const symbol = getCurrencySymbol(code);
  return `${symbol}${Number(converted).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtCurrency(v, code, decimals = 0) {
  const symbol = getCurrencySymbol(code);
  return `${symbol}${Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function pct(v) {
  return `${Number(v).toFixed(1)}%`;
}
