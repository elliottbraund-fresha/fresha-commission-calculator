import React from 'react';
import { CURRENCIES, fmt, fmtLocal } from '../utils/currencies.js';

export const COLORS = {
  prince: "#7B69FF", prince80: "#9587FF", prince60: "#B0A5FF",
  prince40: "#CAC3FF", prince20: "#E5E1FF",
  elton: "#FC5201", hucknall: "#FA3951",
  frank: "#403AFA", frank60: "#9292F7", frank20: "#DBDBFC",
  ceelo: "#5AC43B", pink: "#FF6DFD",
  dark: "#1A1A1A", secondary: "#6B7280", light: "#F9FAFB",
  white: "#FFFFFF", border: "#E5E7EB",
};

export const cardStyle = {
  background: COLORS.white, borderRadius: 12, padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  border: `1px solid ${COLORS.border}`,
};

export const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: `1px solid ${COLORS.border}`, fontSize: 14,
  outline: "none", transition: "border-color 0.2s",
  background: COLORS.white, color: COLORS.dark,
};

export const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: COLORS.secondary, marginBottom: 6,
};

export const btnPrimary = {
  background: COLORS.prince, color: COLORS.white, border: "none",
  padding: "12px 28px", borderRadius: 8, fontSize: 15, fontWeight: 600,
  cursor: "pointer", transition: "all 0.2s", width: "100%",
};

export function InputField({ label, value, onChange, type = "number", prefix, suffix, min, step, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children ? children : (
        <div style={{ position: "relative" }}>
          {prefix && (
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: COLORS.secondary, fontSize: 14, pointerEvents: "none",
            }}>{prefix}</span>
          )}
          <input
            type={type}
            value={value}
            onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
            style={{ ...inputStyle, paddingLeft: prefix ? 28 : 14, paddingRight: suffix ? 50 : 14 }}
            min={min}
            step={step || "any"}
            aria-label={label}
          />
          {suffix && (
            <span style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              color: COLORS.secondary, fontSize: 13, pointerEvents: "none",
            }}>{suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
        aria-label={label}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function DualCurrency({ usd, code, rate, large }) {
  const fontSize = large ? 28 : 18;
  const localSize = large ? 16 : 13;
  return (
    <div>
      <div style={{ fontSize, fontWeight: 700, color: COLORS.dark }}>{fmt(usd, 2)}</div>
      {code !== "USD" && (
        <div style={{ fontSize: localSize, color: COLORS.secondary, marginTop: 2 }}>
          {fmtLocal(usd, code, rate, 2)}
        </div>
      )}
    </div>
  );
}

export function ZoneBadge({ zone }) {
  const config = {
    "No Commission": { bg: "#F3F4F6", color: COLORS.secondary },
    Threshold: { bg: "#F3F4F6", color: COLORS.secondary },
    Decelerator: { bg: "#FFF3ED", color: COLORS.elton },
    Accelerator: { bg: "#ECFDF5", color: COLORS.ceelo },
    Cap: { bg: COLORS.prince20, color: COLORS.prince },
  };
  const c = config[zone] || config.Threshold;
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20,
      fontSize: 12, fontWeight: 600, background: c.bg, color: c.color,
    }}>{zone}</span>
  );
}

export function CurrencySelector({ currencyCode, setCurrencyCode, exchangeRate, setExchangeRate }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <SelectField
        label="Commission Currency"
        value={currencyCode}
        onChange={(v) => {
          setCurrencyCode(v);
          const c = CURRENCIES.find(cur => cur.code === v);
          if (c) setExchangeRate(c.rate);
        }}
        options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
      />
      <InputField label="Exchange Rate (vs 1 USD)" value={exchangeRate} onChange={setExchangeRate} step="0.01" />
    </div>
  );
}
