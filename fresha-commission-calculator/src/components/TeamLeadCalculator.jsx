import React, { useState } from 'react';
import { Users, Info, AlertTriangle, Award } from 'lucide-react';
import { COLORS, cardStyle, btnPrimary, inputStyle, InputField, SelectField, DualCurrency, ZoneBadge, CurrencySelector } from './shared.jsx';
import { fmt, fmtLocal, pct, CURRENCIES } from '../utils/currencies.js';
import { calcTLCommission, getTLPersonalPct } from '../utils/teamLeadCalc.js';

export default function TeamLeadCalculatorTab() {
  const [rampMonth, setRampMonth] = useState("M1+");
  const [variablePayInput, setVariablePayInput] = useState(5000);
  const [variablePayInLocal, setVariablePayInLocal] = useState(false);
  const [baseBDMTarget, setBaseBDMTarget] = useState(10000);
  const [baseBDMTargetInLocal, setBaseBDMTargetInLocal] = useState(false);
  const [bdmCount, setBdmCount] = useState(3);
  const [bdmTargets, setBdmTargets] = useState([10000, 10000, 10000]);
  const [bdmActuals, setBdmActuals] = useState([9000, 11000, 8000]);
  const [bdmNames, setBdmNames] = useState(["", "", ""]);
  const [tlPersonalMRR, setTlPersonalMRR] = useState(6000);
  const [tlPersonalMRRInLocal, setTlPersonalMRRInLocal] = useState(false);
  const [tlOneTimeRevenue, setTlOneTimeRevenue] = useState(3000);
  const [tlOneTimeRevenueInLocal, setTlOneTimeRevenueInLocal] = useState(false);
  const [bdmTargetsInLocal, setBdmTargetsInLocal] = useState(false);
  const [bdmActualsInLocal, setBdmActualsInLocal] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const isLocal = currencyCode !== "USD" && exchangeRate > 0;

  const variablePay = variablePayInLocal && isLocal
    ? variablePayInput / exchangeRate
    : variablePayInput;

  const tlPersonalMRRUSD = tlPersonalMRRInLocal && isLocal
    ? tlPersonalMRR / exchangeRate
    : tlPersonalMRR;

  const tlOneTimeRevenueUSD = tlOneTimeRevenueInLocal && isLocal
    ? tlOneTimeRevenue / exchangeRate
    : tlOneTimeRevenue;

  const bdmTargetsUSD = bdmTargetsInLocal && isLocal
    ? bdmTargets.map(t => t / exchangeRate)
    : bdmTargets;

  const baseBDMTargetUSD = baseBDMTargetInLocal && isLocal
    ? baseBDMTarget / exchangeRate
    : baseBDMTarget;

  const bdmActualsUSD = bdmActualsInLocal && isLocal
    ? bdmActuals.map(a => a / exchangeRate)
    : bdmActuals;

  const localCheckbox = (checked, setCh, usdValue) => {
    if (!isLocal) return null;
    return (
      <div style={{ marginTop: -12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 12, color: COLORS.secondary, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={checked} onChange={e => setCh(e.target.checked)} />
          Enter in {currencyCode}
        </label>
        {checked && <span style={{ fontSize: 12, color: COLORS.secondary }}>= {fmt(usdValue, 2)} USD</span>}
      </div>
    );
  };

  const handleBdmCountChange = (count) => {
    const n = Math.max(0, Math.min(15, typeof count === "string" ? parseInt(count, 10) || 0 : count));
    setBdmCount(n);
    const newTargets = [...bdmTargets];
    const newActuals = [...bdmActuals];
    const newNames = [...bdmNames];
    while (newTargets.length < n) { newTargets.push(baseBDMTarget); newActuals.push(0); newNames.push(""); }
    setBdmTargets(newTargets.slice(0, n));
    setBdmActuals(newActuals.slice(0, n));
    setBdmNames(newNames.slice(0, n));
  };

  const handleCalc = () => {
    const r = calcTLCommission({
      rampMonth, baseBDMTarget: baseBDMTargetUSD, bdmCount, bdmTargets: bdmTargetsUSD, bdmActuals: bdmActualsUSD,
      bdmNames, tlPersonalMRR: tlPersonalMRRUSD, tlOneTimeRevenue: tlOneTimeRevenueUSD, variablePay, exchangeRate,
    });
    setResult(r);
    if (r.achievementPct > 100 && r.zone !== "No Commission" && r.zone !== "Threshold") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Currency selector at the top */}
      <div style={{ ...cardStyle, padding: "16px 24px" }}>
        <CurrencySelector currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} />
      </div>

      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Team Lead Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <SelectField label="Ramp Month" value={rampMonth} onChange={setRampMonth} options={[
                { value: "M0", label: "M0 (Training)" }, { value: "M1+", label: "M1+ (Full)" },
              ]} />
              <InputField label={`Base BDM Target (${baseBDMTargetInLocal && isLocal ? currencyCode : "USD"})`} value={baseBDMTarget} onChange={setBaseBDMTarget} prefix={baseBDMTargetInLocal && isLocal ? currencyCode : "$"} />
            </div>
            {localCheckbox(baseBDMTargetInLocal, setBaseBDMTargetInLocal, baseBDMTargetUSD)}
            <InputField label={`Monthly Variable Pay (${variablePayInLocal && isLocal ? currencyCode : "USD"})`} value={variablePayInput} onChange={setVariablePayInput} prefix={variablePayInLocal && isLocal ? currencyCode : "$"} />
            {isLocal && (
              <div style={{ marginTop: -12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, color: COLORS.secondary, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={variablePayInLocal} onChange={e => setVariablePayInLocal(e.target.checked)} />
                  Enter in {currencyCode}
                </label>
                {variablePayInLocal && <span style={{ fontSize: 12, color: COLORS.secondary }}>= {fmt(variablePay, 2)} USD</span>}
              </div>
            )}
            <InputField label="Number of Quota-Carrying BDMs" value={bdmCount} onChange={handleBdmCountChange} min={0} />

            <div style={{ padding: "12px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16 }}>
              <strong>Personal Target Scale:</strong> {""% } of BDM target = {fmt(baseBDMTargetUSD * getTLPersonalPct(bdmCount))}
            </div>

            <div style={{ padding: "10px 16px", background: COLORS.light, borderRadius: 8, fontSize: 13, color: COLORS.secondary, marginBottom: 16 }}>
              <strong>TL Commission Rules: la in b" , parseInt(count, 10) || 0 : count\r]x,
            setBdmCount(n);
            const newTargets = [...bdmTargets];
            const newActuals = [...bdmActuals];
            const newNames = [...bdmNames];
            while (newTargets.length < n) { newTargets.push(baseBDMTarget); newActuals.push(0); newNames.push(""); }
            setBdmTargets(newTargets.slice(0, n));
            setBdmActuals(newActuals.slice(0, n));
            setBdmNames(newNames.slice(0, n));
          };

              </strong> Threshold 80% | Decelerator 2x | Accelerator 2x | Cap 125%
            </div>

            <InputField label={`TL Personal MRR Generated (${tlPersonalMRRInLocal && isLocal ? currencyCode : "USD"})`} value={tlPersonalMRR} onChange={setTlPersonalMRR} prefix={tlPersonalMRRInLocal && isLocal ? currencyCode : "$"} />
            {localCheckbox(tlPersonalMRRInLocal, setTlPersonalMRRInLocal, tlPersonalMRRUSD)}
            <InputField label={`TL One-Time Revenue Sold (${tlOneTimeRevenueInLocal && isLocal ? currencyCode : "USD"})`} value={tlOneTimeRevenue} onChange={setTlOneTimeRevenue} prefix={tlOneTimeRevenueInLocal && isLocal ? currencyCode : "$"} />
            {localCheckbox(tlOneTimeRevenueInLocal, setTlOneTimeRevenueInLocal, tlOneTimeRevenueUSD)}
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
              <div style={{ display: "grid", gridTemplateColumns: "minmax(80px, 1fr) 1fr 1fr", gap: 8, fontSize: 12, fontWeight: 600, color: COLORS.secondary, paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}` }}>
                <div>Name</div><div>Target ({"String" false }}></div>
  
  while (newTargets.length < n) { newTargets.push(baseBDMTarget); newActuals.push(0); newNames.push(""); }
  setBdmTargets(newTargets.slice(0, n));
  setBdmActuals(newActuals.slice(0, n));
  setBdmNames(newNames.slice(0, n));
} 
