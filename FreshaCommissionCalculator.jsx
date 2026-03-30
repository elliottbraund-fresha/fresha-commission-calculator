import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, BarChart, Bar, Cell, Legend
} from "recharts";
import {
  BookOpen, Calculator, RotateCcw, Users, ChevronRight,
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Award, Target, Zap, Shield, Info
} from "lucide-react";

/* ═══════════════════════════════════════════
   CONSTANTS & DATA
   ═══════════════════════════════════════════ */
const COLORS = {
  prince: "#7B69FF", prince80: "#9587FF", prince60: "#B0A5FF",
  prince40: "#CAC3FF", prince20: "#E5E1FF",
  elton: "#FC5201", hucknall: "#FA3951",
  frank: "#403AFA", frank60: "#9292F7", frank20: "#DBDBFC",
  ceelo: "#5AC43B", pink: "#FF6DFD",
  dark: "#1A1A1A", secondary: "#6B7280", light: "#F9FAFB",
  white: "#FFFFFF", cardBg: "#FFFFFF", border: "#E5E7EB",
};

const CURRENCIES = [
  { code: "USD", name: "US Dollar", rate: 1.0 },
  { code: "GBP", name: "British Pound", rate: 0.79 },
  { code: "EUR", name: "Euro", rate: 0.92 },
  { code: "AUD", name: "Australian Dollar", rate: 1.55 },
  { code: "AED", name: "UAE Dirham", rate: 3.67 },
  { code: "BRL", name: "Brazilian Real", rate: 5.80 },
  { code: "JPY", name: "Japanese Yen", rate: 150.0 },
  { code: "CAD", name: "Canadian Dollar", rate: 1.36 },
  { code: "SAR", name: "Saudi Riyal", rate: 3.75 },
  { code: "KWD", name: "Kuwaiti Dinar", rate: 0.31 },
];

const ACCELERATOR_TABLE = [
  { deals: "1–3", multiplier: 1.0 },
  { deals: "4", multiplier: 1.2 },
  { deals: "5", multiplier: 1.4 },
  { deals: "6", multiplier: 1.6 },
  { deals: "7", multiplier: 1.8 },
  { deals: "8+", multiplier: 2.0 },
];

const getAcceleratorMultiplier = (deals) => {
  if (deals <= 3) return 1.0;
  if (deals === 4) return 1.2;
  if (deals === 5) return 1.4;
  if (deals === 6) return 1.6;
  if (deals === 7) return 1.8;
  return 2.0;
};

const TL_PERSONAL_SCALE = [
  { min: 0, max: 0, pct: 1.5, label: "0 BDMs" },
  { min: 1, max: 3, pct: 0.8, label: "1–3 BDMs" },
  { min: 4, max: 6, pct: 0.33, label: "4–6 BDMs" },
  { min: 7, max: 999, pct: 0.0, label: "7+ BDMs" },
];

const getTLPersonalPct = (count) => {
  const bracket = TL_PERSONAL_SCALE.find(b => count >= b.min && count <= b.max);
  return bracket ? bracket.pct : 0;
};

const fmt = (v, decimals = 0) => {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const fmtLocal = (v, code, rate, decimals = 0) => {
  if (code === "USD") return "";
  const converted = v * rate;
  return `${code} ${Number(converted).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const pct = (v) => `${Number(v).toFixed(1)}%`;

/* ═══════════════════════════════════════════
   COMMISSION CALCULATION (BDE/BDM/Snr BDM)
   ═══════════════════════════════════════════ */
function calcBDMCommission({ role, rampMonth, monthlyTarget, actualMRR, dealCount, oneTimeRevenue, currencyCode, exchangeRate }) {
  const result = {
    achievementPct: 0, zone: "Threshold", acceleratorMultiplier: 1.0,
    baseCommission: 0, performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    effectiveTarget: monthlyTarget, rampMessage: null,
  };

  if (rampMonth === "M0") {
    result.rampMessage = "No commission earned during M0 (training month).";
    result.zone = "No Commission";
    return result;
  }

  let effectiveTarget = monthlyTarget;
  if (rampMonth === "M1") {
    effectiveTarget = monthlyTarget * 0.5;
    result.rampMessage = "M1: Target at 50%. Accelerators apply once full target is exceeded.";
  }
  result.effectiveTarget = effectiveTarget;

  if (effectiveTarget <= 0) return result;

  const achievement = (actualMRR / effectiveTarget) * 100;
  result.achievementPct = achievement;

  // Target commission = effectiveTarget (the OTE variable portion equals the target MRR as a base)
  // We treat "target commission" as the effectiveTarget value for simplicity
  const targetCommission = effectiveTarget;

  if (achievement < 70) {
    result.zone = "Threshold";
    result.baseCommission = 0;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    // Decelerated: ramps from $0 at 70% to 100% of target commission at 100%
    // With 2x decelerator penalty
    const progressInZone = (achievement - 70) / 30; // 0 at 70%, 1 at 100%
    // Decelerated curve: use quadratic (penalty is steeper near 70%)
    const deceleratedProgress = Math.pow(progressInZone, 2);
    result.baseCommission = targetCommission * deceleratedProgress;
  } else {
    // At or above 100%
    result.baseCommission = targetCommission; // full base at 100%

    const cappedAchievement = Math.min(achievement, 175);
    const aboveTarget = cappedAchievement - 100;

    const accelMultiplier = getAcceleratorMultiplier(dealCount);
    result.acceleratorMultiplier = accelMultiplier;

    // Each pct point above 100% earns at accelerated rate
    const acceleratorBonus = (aboveTarget / 100) * targetCommission * accelMultiplier;
    result.baseCommission += acceleratorBonus;

    if (achievement >= 175) {
      result.zone = "Cap";
    } else {
      result.zone = "Accelerator";
    }
  }

  // Performance bonus
  const achievementVsFullTarget = (actualMRR / monthlyTarget) * 100;
  if (oneTimeRevenue > 0) {
    if (achievementVsFullTarget >= 100) {
      result.performanceBonus = oneTimeRevenue * 0.4;
    } else if (achievementVsFullTarget >= 90) {
      result.performanceBonus = oneTimeRevenue * 0.2;
    }
  }

  result.totalUSD = result.baseCommission + result.performanceBonus;
  result.totalLocal = result.totalUSD * exchangeRate;

  return result;
}

/* ═══════════════════════════════════════════
   RETENTION CALCULATION
   ═══════════════════════════════════════════ */
function calcRetention({ originalMRR, retainedMRR, originalCommission, currentMonthCommission, exchangeRate }) {
  const result = {
    retentionPct: 0, shortfallPct: 0, clawbackAmount: 0,
    adjustedCommission: 0, netCommission: 0, carryForward: 0,
    status: "green",
  };

  if (originalMRR <= 0) return result;

  result.retentionPct = (retainedMRR / originalMRR) * 100;
  if (result.retentionPct >= 100) {
    result.adjustedCommission = originalCommission;
    result.netCommission = currentMonthCommission;
    result.status = "green";
    return result;
  }

  result.shortfallPct = 100 - result.retentionPct;
  result.adjustedCommission = originalCommission * (result.retentionPct / 100);
  result.clawbackAmount = originalCommission - result.adjustedCommission;
  result.netCommission = currentMonthCommission - result.clawbackAmount;

  if (result.netCommission < 0) {
    result.carryForward = Math.abs(result.netCommission);
    result.netCommission = 0;
  }

  result.status = result.retentionPct >= 80 ? "amber" : "red";
  return result;
}

/* ═══════════════════════════════════════════
   TL COMMISSION CALCULATION
   ═══════════════════════════════════════════ */
function calcTLCommission({ rampMonth, baseBDMTarget, bdmCount, bdmTargets, bdmActuals, tlPersonalMRR, tlOneTimeRevenue, exchangeRate }) {
  const result = {
    personalTarget: 0, totalTarget: 0, totalActual: 0,
    achievementPct: 0, zone: "Threshold", commission: 0,
    performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    rampMessage: null, bdmBreakdown: [],
  };

  if (rampMonth === "M0") {
    result.rampMessage = "No commission earned during M0 (training month).";
    result.zone = "No Commission";
    return result;
  }

  const personalPct = getTLPersonalPct(bdmCount);
  result.personalTarget = baseBDMTarget * personalPct;

  let sumBDMTargets = 0, sumBDMActuals = 0;
  for (let i = 0; i < bdmCount; i++) {
    const t = bdmTargets[i] || baseBDMTarget;
    const a = bdmActuals[i] || 0;
    sumBDMTargets += t;
    sumBDMActuals += a;
    result.bdmBreakdown.push({ index: i + 1, target: t, actual: a, achievement: t > 0 ? (a / t) * 100 : 0 });
  }

  result.totalTarget = result.personalTarget + sumBDMTargets;
  result.totalActual = tlPersonalMRR + sumBDMActuals;

  if (result.totalTarget <= 0) return result;

  const achievement = (result.totalActual / result.totalTarget) * 100;
  result.achievementPct = achievement;

  const targetCommission = result.totalTarget;

  // TL: threshold 80%, cap 125%, decel 2x, accel 2x
  if (achievement < 80) {
    result.zone = "Threshold";
    result.commission = 0;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    const progressInZone = (achievement - 80) / 20;
    const deceleratedProgress = Math.pow(progressInZone, 2);
    result.commission = targetCommission * deceleratedProgress;
  } else {
    result.commission = targetCommission;
    const cappedAchievement = Math.min(achievement, 125);
    const aboveTarget = cappedAchievement - 100;
    // 2x accelerator
    const acceleratorBonus = (aboveTarget / 100) * targetCommission * 2;
    result.commission += acceleratorBonus;

    result.zone = achievement >= 125 ? "Cap" : "Accelerator";
  }

  // Performance bonus on TL's own one-time revenue
  if (tlOneTimeRevenue > 0) {
    const personalAchievement = result.achievementPct;
    if (personalAchievement >= 100) {
      result.performanceBonus = tlOneTimeRevenue * 0.4;
    } else if (personalAchievement >= 90) {
      result.performanceBonus = tlOneTimeRevenue * 0.2;
    }
  }

  result.totalUSD = result.commission + result.performanceBonus;
  result.totalLocal = result.totalUSD * exchangeRate;

  return result;
}

/* ═══════════════════════════════════════════
   GENERATE COMMISSION CURVE DATA
   ═══════════════════════════════════════════ */
function generateCurveData() {
  const data = [];
  for (let x = 0; x <= 200; x += 1) {
    let y = 0;
    if (x < 70) {
      y = 0;
    } else if (x <= 100) {
      const progress = (x - 70) / 30;
      y = Math.pow(progress, 2) * 100;
    } else if (x <= 175) {
      const above = x - 100;
      y = 100 + above * 1.5; // representative accelerated
    } else {
      y = 100 + 75 * 1.5; // capped
    }
    data.push({ achievement: x, earnings: Math.round(y * 10) / 10 });
  }
  return data;
}

/* ═══════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════ */
const cardStyle = {
  background: COLORS.white, borderRadius: 12, padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  border: `1px solid ${COLORS.border}`,
};

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: `1px solid ${COLORS.border}`, fontSize: 14,
  outline: "none", transition: "border-color 0.2s",
  background: COLORS.white, color: COLORS.dark,
};

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: COLORS.secondary, marginBottom: 6 };

const btnPrimary = {
  background: COLORS.prince, color: COLORS.white, border: "none",
  padding: "12px 28px", borderRadius: 8, fontSize: 15, fontWeight: 600,
  cursor: "pointer", transition: "background 0.2s",
};

function InputField({ label, value, onChange, type = "number", prefix, suffix, min, step, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children ? children : (
        <div style={{ position: "relative" }}>
          {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.secondary, fontSize: 14 }}>{prefix}</span>}
          <input
            type={type}
            value={value}
            onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
            style={{ ...inputStyle, paddingLeft: prefix ? 28 : 14, paddingRight: suffix ? 50 : 14 }}
            min={min}
            step={step || "any"}
          />
          {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.secondary, fontSize: 13 }}>{suffix}</span>}
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function DualCurrency({ usd, code, rate, large }) {
  const fontSize = large ? 28 : 18;
  const localSize = large ? 16 : 13;
  return (
    <div>
      <div style={{ fontSize, fontWeight: 700, color: COLORS.dark }}>{fmt(usd, 2)}</div>
      {code !== "USD" && (
        <div style={{ fontSize: localSize, color: COLORS.secondary, marginTop: 2 }}>{fmtLocal(usd, code, rate, 2)}</div>
      )}
    </div>
  );
}

function ZoneBadge({ zone }) {
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

function CurrencySelector({ currencyCode, setCurrencyCode, exchangeRate, setExchangeRate }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <SelectField
        label="Commission Currency"
        value={currencyCode}
        onChange={(v) => {
          setCurrencyCode(v);
          const c = CURRENCIES.find(c => c.code === v);
          if (c) setExchangeRate(c.rate);
        }}
        options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
      />
      <InputField label="Exchange Rate (vs 1 USD)" value={exchangeRate} onChange={setExchangeRate} step="0.01" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 1: COMMISSION STRUCTURE
   ═══════════════════════════════════════════ */
function CommissionStructure() {
  const curveData = useMemo(generateCurveData, []);

  const concepts = [
    { title: "Threshold", range: "70%", desc: "Minimum attainment before any commission is earned. Below this, variable earnings = $0.", icon: <Shield size={22} />, color: COLORS.secondary },
    { title: "Decelerator", range: "70% – 100%", desc: "Above threshold but below target. A reduced rate applies (2x multiplier on shortfall) to penalise underperformance.", icon: <TrendingDown size={22} />, color: COLORS.elton },
    { title: "Accelerator", range: "100% – 175%", desc: "Above target. Commission rate increases — rewarding over-performance. For BDMs, the accelerator is variable based on deal count.", icon: <TrendingUp size={22} />, color: COLORS.ceelo },
    { title: "Cap", range: "175%", desc: "Maximum commission ceiling. Earnings flatten beyond this point regardless of further attainment.", icon: <Zap size={22} />, color: COLORS.prince },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* 1.1 Commission Definitions */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={20} color={COLORS.prince} /> Commission Definitions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {concepts.map(c => (
            <div key={c.title} style={{ ...cardStyle, borderLeft: `4px solid ${c.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ color: c.color }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.secondary }}>{c.range}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: COLORS.secondary, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 1.2 Commission Curve */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 20 }}>Commission Curve</h2>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={curveData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.prince} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.prince} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="achievement" tickFormatter={v => `${v}%`} label={{ value: "Achievement to Goal", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: COLORS.secondary } }} />
            <YAxis tickFormatter={v => `${v}%`} label={{ value: "Variable Earnings", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: COLORS.secondary } }} />
            <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Earnings"]} labelFormatter={l => `Achievement: ${l}%`} />
            <ReferenceArea x1={0} x2={70} fill="#F3F4F6" fillOpacity={0.8} />
            <ReferenceArea x1={70} x2={100} fill={COLORS.elton} fillOpacity={0.07} />
            <ReferenceArea x1={100} x2={175} fill={COLORS.ceelo} fillOpacity={0.07} />
            <ReferenceArea x1={175} x2={200} fill={COLORS.prince20} fillOpacity={0.5} />
            <ReferenceLine x={70} stroke={COLORS.hucknall} strokeDasharray="4 4" label={{ value: "70% Threshold", position: "top", style: { fontSize: 11, fill: COLORS.hucknall } }} />
            <ReferenceLine x={100} stroke={COLORS.ceelo} strokeDasharray="4 4" label={{ value: "100% Target", position: "top", style: { fontSize: 11, fill: COLORS.ceelo } }} />
            <ReferenceLine x={175} stroke={COLORS.prince} strokeDasharray="4 4" label={{ value: "175% Cap", position: "top", style: { fontSize: 11, fill: COLORS.prince } }} />
            <Area type="monotone" dataKey="earnings" stroke={COLORS.prince} strokeWidth={3} fill="url(#curveGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "No Commission (0–70%)", color: "#D1D5DB" },
            { label: "Decelerator (70–100%)", color: COLORS.elton },
            { label: "Accelerator (100–175%)", color: COLORS.ceelo },
            { label: "Cap (175%+)", color: COLORS.prince },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.secondary }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} /> {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* 1.3 Ramp Schedule */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Ramp Schedule</h2>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
          <thead>
            <tr style={{ background: COLORS.prince20 }}>
              {["Role", "M0", "M1", "M2+"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px 16px", fontWeight: 500 }}>BDE, BDM, Snr BDM</td>
              <td style={{ padding: "12px 16px", color: COLORS.hucknall, fontWeight: 600 }}>No Commission</td>
              <td style={{ padding: "12px 16px", color: COLORS.elton, fontWeight: 600 }}>50% of Target</td>
              <td style={{ padding: "12px 16px", color: COLORS.ceelo, fontWeight: 600 }}>100% of Target</td>
            </tr>
            <tr style={{ background: COLORS.light }}>
              <td style={{ padding: "12px 16px", fontWeight: 500 }}>TL BDM</td>
              <td style={{ padding: "12px 16px", color: COLORS.hucknall, fontWeight: 600 }}>No Commission</td>
              <td style={{ padding: "12px 16px", color: COLORS.ceelo, fontWeight: 600 }}>100% of Target</td>
              <td style={{ padding: "12px 16px", color: COLORS.ceelo, fontWeight: 600 }}>100% of Target</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: "10px 14px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={16} /> BDM hires should always start on the First Monday of the Month.
        </div>
      </div>

      {/* 1.4 Accelerator Structure */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>BDM Accelerator Structure (Deal Count Based)</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", justifyContent: "center" }}>
          {ACCELERATOR_TABLE.map((item, i) => {
            const intensity = 0.3 + (i / (ACCELERATOR_TABLE.length - 1)) * 0.7;
            const bg = `rgba(123, 105, 255, ${intensity})`;
            const textColor = intensity > 0.5 ? COLORS.white : COLORS.dark;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  background: bg, color: textColor, padding: "18px 24px",
                  borderRadius: 10, textAlign: "center", minWidth: 100,
                  position: "relative",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{item.multiplier}x</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{item.deals} {item.deals.includes("–") || item.deals.includes("+") ? "deals" : "deal" + (item.deals === "1" ? "" : "s")}</div>
                </div>
                {i < ACCELERATOR_TABLE.length - 1 && (
                  <ChevronRight size={20} color={COLORS.prince60} style={{ margin: "0 4px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 1.5 Bonus Structure */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={20} color={COLORS.ceelo} /> BDM Performance Bonus Structure
          </span>
        </h2>
        <p style={{ fontSize: 14, color: COLORS.secondary, marginBottom: 16, lineHeight: 1.5 }}>
          Separate from MRR commission. BDMs earn a bonus on one-time revenue items (Account Setup Packages, Data Migration Packages, Photography Services, Terminal Hardware).
        </p>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
          <thead>
            <tr style={{ background: COLORS.prince20 }}>
              {["Milestone", "Qualification", "Cap", "Bonus %"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 600, color: COLORS.ceelo }}>NEW</span> (Performance Bonus)</td>
              <td style={{ padding: "12px 16px" }}>90% of MRR Target</td>
              <td style={{ padding: "12px 16px" }}>Uncapped</td>
              <td style={{ padding: "12px 16px", fontWeight: 700 }}>20%</td>
            </tr>
            <tr style={{ background: COLORS.light }}>
              <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 600, color: COLORS.prince }}>INCREASED</span> (Milestone Reward)</td>
              <td style={{ padding: "12px 16px" }}>100% of MRR Target</td>
              <td style={{ padding: "12px 16px" }}>Uncapped</td>
              <td style={{ padding: "12px 16px", fontWeight: 700 }}>40%</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF3ED", borderRadius: 8, fontSize: 13, color: COLORS.elton, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> Regional exceptions: Kosovo = 0% / 10%, GCC = 10% / 20%
        </div>
      </div>

      {/* 1.6 Thresholds by Role */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Thresholds & Multipliers by Role</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
            <thead>
              <tr style={{ background: COLORS.prince20 }}>
                {["Role", "Threshold", "Cap", "Decelerator", "Accelerator"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { role: "BDE, BDM, Snr BDM", threshold: "70%", cap: "175%", decel: "2x", accel: "Deal count based" },
                { role: "TL BDM", threshold: "80%", cap: "125%", decel: "2x", accel: "2x" },
                { role: "Head of BDM", threshold: "80%", cap: "125%", decel: "2x", accel: "2x" },
                { role: "VP of Sales", threshold: "80%", cap: "112.5%", decel: "4x", accel: "BDMs on target based" },
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? COLORS.light : COLORS.white }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{row.role}</td>
                  <td style={{ padding: "12px 16px" }}>{row.threshold}</td>
                  <td style={{ padding: "12px 16px" }}>{row.cap}</td>
                  <td style={{ padding: "12px 16px" }}>{row.decel}</td>
                  <td style={{ padding: "12px 16px" }}>{row.accel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 2: COMMISSION CALCULATOR
   ═══════════════════════════════════════════ */
function CommissionCalculatorTab() {
  const [role, setRole] = useState("BDM");
  const [rampMonth, setRampMonth] = useState("M2+");
  const [monthlyTarget, setMonthlyTarget] = useState(10000);
  const [actualMRR, setActualMRR] = useState(8500);
  const [dealCount, setDealCount] = useState(5);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [oneTimeRevenue, setOneTimeRevenue] = useState(2000);
  const [calculated, setCalculated] = useState(null);

  const handleCalc = () => {
    const res = calcBDMCommission({ role, rampMonth, monthlyTarget, actualMRR, dealCount, oneTimeRevenue, currencyCode, exchangeRate });
    setCalculated(res);
  };

  const curveData = useMemo(generateCurveData, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Inputs */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 20 }}>Calculator Inputs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <SelectField label="Role" value={role} onChange={setRole} options={[
            { value: "BDE", label: "BDE" }, { value: "BDM", label: "BDM" }, { value: "Snr BDM", label: "Snr BDM" },
          ]} />
          <SelectField label="Ramp Month" value={rampMonth} onChange={setRampMonth} options={[
            { value: "M0", label: "M0 (Training)" }, { value: "M1", label: "M1 (Ramp)" }, { value: "M2+", label: "M2+ (Full)" },
          ]} />
        </div>
        <InputField label="Monthly MRR Target (USD)" value={monthlyTarget} onChange={setMonthlyTarget} prefix="$" />
        <InputField label="Actual MRR Generated (USD)" value={actualMRR} onChange={setActualMRR} prefix="$" />
        <InputField label="Number of Deals Signed" value={dealCount} onChange={setDealCount} min={0} />
        <InputField label="One-Time Revenue Sold (USD)" value={oneTimeRevenue} onChange={setOneTimeRevenue} prefix="$" />
        <CurrencySelector currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} />
        <button onClick={handleCalc} style={btnPrimary} onMouseOver={e => e.target.style.background = COLORS.prince80} onMouseOut={e => e.target.style.background = COLORS.prince}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <Calculator size={18} /> Calculate Commission
          </span>
        </button>
      </div>

      {/* Results */}
      <div>
        {calculated ? (
          <div style={{
            ...cardStyle,
            borderTop: `4px solid ${calculated.zone === "Accelerator" ? COLORS.ceelo : calculated.zone === "Cap" ? COLORS.prince : calculated.zone === "Decelerator" ? COLORS.elton : COLORS.secondary}`,
            ...(calculated.zone === "Accelerator" ? { boxShadow: `0 0 20px ${COLORS.ceelo}22` } : {}),
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, margin: 0 }}>Results</h2>
              <ZoneBadge zone={calculated.zone} />
            </div>

            {calculated.rampMessage && (
              <div style={{ padding: "12px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Info size={16} /> {calculated.rampMessage}
              </div>
            )}

            {calculated.zone !== "No Commission" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={{ padding: 16, background: COLORS.light, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 4 }}>Achievement to Goal</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: calculated.achievementPct >= 100 ? COLORS.ceelo : calculated.achievementPct >= 70 ? COLORS.elton : COLORS.hucknall }}>
                      {pct(calculated.achievementPct)}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: COLORS.light, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 4 }}>Accelerator Multiplier</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.prince }}>{calculated.acceleratorMultiplier}x</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={{ color: COLORS.secondary, fontSize: 14 }}>Base Commission</span>
                    <DualCurrency usd={calculated.baseCommission} code={currencyCode} rate={exchangeRate} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={{ color: COLORS.secondary, fontSize: 14 }}>Performance Bonus</span>
                    <DualCurrency usd={calculated.performanceBonus} code={currencyCode} rate={exchangeRate} />
                  </div>
                </div>

                <div style={{ padding: 20, background: calculated.zone === "Accelerator" ? `${COLORS.ceelo}11` : COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: COLORS.secondary, marginBottom: 6 }}>Total Earnings</div>
                  <DualCurrency usd={calculated.totalUSD} code={currencyCode} rate={exchangeRate} large />
                </div>

                {/* Mini curve */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.secondary, marginBottom: 8 }}>Your Position on the Curve</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={curveData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <Area type="monotone" dataKey="earnings" stroke={COLORS.prince} strokeWidth={2} fill={COLORS.prince20} dot={false} />
                      <ReferenceLine x={Math.min(Math.round(calculated.achievementPct), 200)} stroke={COLORS.hucknall} strokeWidth={2} label={{ value: `${pct(calculated.achievementPct)}`, position: "top", style: { fontSize: 11, fill: COLORS.hucknall, fontWeight: 700 } }} />
                      <XAxis dataKey="achievement" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
            <Calculator size={48} color={COLORS.prince40} />
            <p style={{ color: COLORS.secondary, marginTop: 16, fontSize: 15 }}>Enter your details and click Calculate to see your commission breakdown.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 3: RETENTION ADJUSTMENT
   ═══════════════════════════════════════════ */
function RetentionAdjustmentTab() {
  const [originalMRR, setOriginalMRR] = useState(50000);
  const [retainedMRR, setRetainedMRR] = useState(42000);
  const [originalCommission, setOriginalCommission] = useState(5000);
  const [currentMonthCommission, setCurrentMonthCommission] = useState(6000);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [result, setResult] = useState(null);

  const handleCalc = () => {
    setResult(calcRetention({ originalMRR, retainedMRR, originalCommission, currentMonthCommission, exchangeRate }));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Info + Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.prince}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark, marginBottom: 10 }}>How Retention Adjustment Works</h3>
          <div style={{ fontSize: 13, color: COLORS.secondary, lineHeight: 1.7 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: COLORS.prince, minWidth: 70 }}>Month 0</span> BDM signs new partners (MRR is recorded)
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: COLORS.prince, minWidth: 70 }}>End of M1</span> Full commission is paid; 3-month retention tracking begins
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontWeight: 700, color: COLORS.prince, minWidth: 70 }}>End of M4</span> Cohort retention reviewed. Any MRR decline = downward adjustment
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 20 }}>Clawback Inputs</h2>
          <InputField label="Original MRR Signed — Month 0 (USD)" value={originalMRR} onChange={setOriginalMRR} prefix="$" />
          <InputField label="MRR Retained — End of Month 4 (USD)" value={retainedMRR} onChange={setRetainedMRR} prefix="$" />
          <InputField label="Original Commission Paid (USD)" value={originalCommission} onChange={setOriginalCommission} prefix="$" />
          <InputField label="Current Month's Commission (USD)" value={currentMonthCommission} onChange={setCurrentMonthCommission} prefix="$" />
          <CurrencySelector currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} />
          <button onClick={handleCalc} style={btnPrimary} onMouseOver={e => e.target.style.background = COLORS.prince80} onMouseOut={e => e.target.style.background = COLORS.prince}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <RotateCcw size={18} /> Calculate Adjustment
            </span>
          </button>
        </div>
      </div>

      {/* Results */}
      <div>
        {result ? (
          <div style={{
            ...cardStyle,
            borderTop: `4px solid ${result.status === "green" ? COLORS.ceelo : result.status === "amber" ? COLORS.elton : COLORS.hucknall}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, margin: 0 }}>Retention Results</h2>
              <div style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: result.status === "green" ? `${COLORS.ceelo}18` : result.status === "amber" ? `${COLORS.elton}18` : `${COLORS.hucknall}18`,
                color: result.status === "green" ? COLORS.ceelo : result.status === "amber" ? COLORS.elton : COLORS.hucknall,
              }}>
                {result.status === "green" ? "No Clawback" : result.status === "amber" ? "Partial Clawback" : "Significant Clawback"}
              </div>
            </div>

            {/* Retention gauge */}
            <div style={{ padding: 20, background: COLORS.light, borderRadius: 10, marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 4 }}>Retention Rate</div>
              <div style={{
                fontSize: 42, fontWeight: 700,
                color: result.status === "green" ? COLORS.ceelo : result.status === "amber" ? COLORS.elton : COLORS.hucknall,
              }}>
                {pct(result.retentionPct)}
              </div>
              {result.shortfallPct > 0 && (
                <div style={{ fontSize: 13, color: COLORS.hucknall, marginTop: 4 }}>Shortfall: {pct(result.shortfallPct)}</div>
              )}
            </div>

            {result.status === "green" ? (
              <div style={{ padding: 20, background: `${COLORS.ceelo}11`, borderRadius: 10, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <CheckCircle size={22} color={COLORS.ceelo} />
                <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.ceelo }}>Retention target met — no clawback applied.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.secondary, fontSize: 14 }}>Original Commission</span>
                  <DualCurrency usd={originalCommission} code={currencyCode} rate={exchangeRate} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.secondary, fontSize: 14 }}>Adjusted Commission</span>
                  <DualCurrency usd={result.adjustedCommission} code={currencyCode} rate={exchangeRate} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.hucknall, fontSize: 14, fontWeight: 600 }}>Clawback Amount</span>
                  <div style={{ color: COLORS.hucknall, fontWeight: 700, fontSize: 18 }}>
                    -{fmt(result.clawbackAmount, 2)}
                    {currencyCode !== "USD" && <div style={{ fontSize: 12, fontWeight: 400 }}>-{fmtLocal(result.clawbackAmount, currencyCode, exchangeRate, 2)}</div>}
                  </div>
                </div>

                <div style={{ padding: 20, background: COLORS.light, borderRadius: 10, textAlign: "center", marginTop: 8 }}>
                  <div style={{ fontSize: 13, color: COLORS.secondary, marginBottom: 6 }}>Net Month 4 Commission Payout</div>
                  <DualCurrency usd={result.netCommission} code={currencyCode} rate={exchangeRate} large />
                </div>

                {result.carryForward > 0 && (
                  <div style={{ padding: "12px 16px", background: `${COLORS.hucknall}12`, borderRadius: 8, fontSize: 13, color: COLORS.hucknall, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <AlertTriangle size={16} />
                    Clawback exceeds current month commission. Remaining balance of {fmt(result.carryForward, 2)} will be carried forward.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
            <RotateCcw size={48} color={COLORS.prince40} />
            <p style={{ color: COLORS.secondary, marginTop: 16, fontSize: 15 }}>Enter cohort retention data to calculate the clawback adjustment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 4: TEAM LEAD CALCULATOR
   ═══════════════════════════════════════════ */
function TeamLeadCalculatorTab() {
  const [rampMonth, setRampMonth] = useState("M1+");
  const [baseBDMTarget, setBaseBDMTarget] = useState(10000);
  const [bdmCount, setBdmCount] = useState(3);
  const [bdmTargets, setBdmTargets] = useState([10000, 10000, 10000]);
  const [bdmActuals, setBdmActuals] = useState([9000, 11000, 8000]);
  const [tlPersonalMRR, setTlPersonalMRR] = useState(6000);
  const [tlOneTimeRevenue, setTlOneTimeRevenue] = useState(3000);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [result, setResult] = useState(null);

  const handleBdmCountChange = (count) => {
    const n = Math.max(0, Math.min(15, count));
    setBdmCount(n);
    const newTargets = [...bdmTargets];
    const newActuals = [...bdmActuals];
    while (newTargets.length < n) { newTargets.push(baseBDMTarget); newActuals.push(0); }
    setBdmTargets(newTargets.slice(0, n));
    setBdmActuals(newActuals.slice(0, n));
  };

  const handleCalc = () => {
    setResult(calcTLCommission({ rampMonth, baseBDMTarget, bdmCount, bdmTargets, bdmActuals, tlPersonalMRR, tlOneTimeRevenue, exchangeRate }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Team Lead Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <SelectField label="Ramp Month" value={rampMonth} onChange={setRampMonth} options={[
                { value: "M0", label: "M0 (Training)" }, { value: "M1+", label: "M1+ (Full)" },
              ]} />
              <InputField label="Base BDM Target (USD)" value={baseBDMTarget} onChange={setBaseBDMTarget} prefix="$" />
            </div>
            <InputField label="Number of Quota-Carrying BDMs" value={bdmCount} onChange={handleBdmCountChange} min={0} />

            {/* Personal target info */}
            <div style={{ padding: "12px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16 }}>
              <strong>Personal Target Scale:</strong> {bdmCount === 0 ? "150%" : bdmCount <= 3 ? "80%" : bdmCount <= 6 ? "33%" : "0%"} of BDM target = {fmt(baseBDMTarget * getTLPersonalPct(bdmCount))}
            </div>

            <InputField label="TL Personal MRR Generated (USD)" value={tlPersonalMRR} onChange={setTlPersonalMRR} prefix="$" />
            <InputField label="TL One-Time Revenue Sold (USD)" value={tlOneTimeRevenue} onChange={setTlOneTimeRevenue} prefix="$" />
            <CurrencySelector currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} />
            <button onClick={handleCalc} style={btnPrimary} onMouseOver={e => e.target.style.background = COLORS.prince80} onMouseOut={e => e.target.style.background = COLORS.prince}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <Users size={18} /> Calculate TL Commission
              </span>
            </button>
          </div>
        </div>

        {/* BDM Rows */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Individual BDM Performance</h2>
          {bdmCount === 0 ? (
            <p style={{ color: COLORS.secondary, fontSize: 14, textAlign: "center", padding: 20 }}>No quota-carrying BDMs. TL operates on personal target only.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8, fontSize: 12, fontWeight: 600, color: COLORS.secondary, paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}` }}>
                <div>BDM</div><div>Target (USD)</div><div>Actual (USD)</div>
              </div>
              {Array.from({ length: bdmCount }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.prince }}>#{i + 1}</div>
                  <input
                    type="number"
                    value={bdmTargets[i] ?? baseBDMTarget}
                    onChange={e => { const v = [...bdmTargets]; v[i] = Number(e.target.value); setBdmTargets(v); }}
                    style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                  />
                  <input
                    type="number"
                    value={bdmActuals[i] ?? 0}
                    onChange={e => { const v = [...bdmActuals]; v[i] = Number(e.target.value); setBdmActuals(v); }}
                    style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{
          ...cardStyle,
          borderTop: `4px solid ${result.zone === "Accelerator" ? COLORS.ceelo : result.zone === "Cap" ? COLORS.prince : result.zone === "Decelerator" ? COLORS.elton : COLORS.secondary}`,
        }}>
          {result.rampMessage ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <Info size={32} color={COLORS.prince} />
              <p style={{ fontSize: 16, color: COLORS.prince, fontWeight: 600, marginTop: 12 }}>{result.rampMessage}</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, margin: 0 }}>Team Lead Results</h2>
                <ZoneBadge zone={result.zone} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Personal Target", value: fmt(result.personalTarget), sub: `${(getTLPersonalPct(bdmCount) * 100).toFixed(0)}% of base` },
                  { label: "Total Target", value: fmt(result.totalTarget) },
                  { label: "Total Actual", value: fmt(result.totalActual) },
                  { label: "Achievement", value: pct(result.achievementPct), color: result.achievementPct >= 100 ? COLORS.ceelo : result.achievementPct >= 80 ? COLORS.elton : COLORS.hucknall },
                ].map((item, i) => (
                  <div key={i} style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: item.color || COLORS.dark }}>{item.value}</div>
                    {item.sub && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 2 }}>{item.sub}</div>}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>TL Commission</div>
                  <DualCurrency usd={result.commission} code={currencyCode} rate={exchangeRate} />
                </div>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>Performance Bonus</div>
                  <DualCurrency usd={result.performanceBonus} code={currencyCode} rate={exchangeRate} />
                </div>
                <div style={{ padding: 20, background: result.zone === "Accelerator" ? `${COLORS.ceelo}11` : COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>Total Payout</div>
                  <DualCurrency usd={result.totalUSD} code={currencyCode} rate={exchangeRate} large />
                </div>
              </div>

              {/* BDM breakdown table */}
              {result.bdmBreakdown.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 12 }}>BDM Breakdown</h3>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: COLORS.prince20 }}>
                        {["BDM", "Target", "Actual", "Achievement"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.bdmBreakdown.map((b, i) => (
                        <tr key={i} style={{ background: i % 2 === 1 ? COLORS.light : COLORS.white }}>
                          <td style={{ padding: "10px 14px", fontWeight: 500 }}>BDM #{b.index}</td>
                          <td style={{ padding: "10px 14px" }}>{fmt(b.target)}</td>
                          <td style={{ padding: "10px 14px" }}>{fmt(b.actual)}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontWeight: 600, color: b.achievement >= 100 ? COLORS.ceelo : b.achievement >= 70 ? COLORS.elton : COLORS.hucknall }}>
                              {pct(b.achievement)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
const TABS = [
  { id: "structure", label: "Commission Structure", icon: <BookOpen size={18} /> },
  { id: "calculator", label: "Commission Calculator", icon: <Calculator size={18} /> },
  { id: "retention", label: "Retention Adjustment", icon: <RotateCcw size={18} /> },
  { id: "teamlead", label: "Team Lead Calculator", icon: <Users size={18} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("structure");

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{
        background: COLORS.dark, padding: "0 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 64,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.white, letterSpacing: "-0.5px" }}>fresha</span>
          <div style={{ width: 1, height: 28, background: "#374151" }} />
          <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>BDM Commission Calculator</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.ceelo }} />
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>v1.0</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 32px", display: "flex", gap: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "16px 24px",
                border: "none", background: "transparent", cursor: "pointer",
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.prince : COLORS.secondary,
                borderBottom: `3px solid ${isActive ? COLORS.prince : "transparent"}`,
                transition: "all 0.2s",
              }}
              onMouseOver={e => { if (!isActive) e.currentTarget.style.color = COLORS.prince80; }}
              onMouseOut={e => { if (!isActive) e.currentTarget.style.color = COLORS.secondary; }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 60px" }}>
        {activeTab === "structure" && <CommissionStructure />}
        {activeTab === "calculator" && <CommissionCalculatorTab />}
        {activeTab === "retention" && <RetentionAdjustmentTab />}
        {activeTab === "teamlead" && <TeamLeadCalculatorTab />}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: COLORS.secondary, borderTop: `1px solid ${COLORS.border}`, background: COLORS.white }}>
        Fresha BDM Commission Calculator — Internal Use Only
      </footer>
    </div>
  );
}
