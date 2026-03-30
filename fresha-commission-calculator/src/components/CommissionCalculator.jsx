import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Calculator, Info } from 'lucide-react';
import { COLORS, cardStyle, btnPrimary, InputField, SelectField, DualCurrency, ZoneBadge, CurrencySelector } from './shared.jsx';
import { pct } from '../utils/currencies.js';
import { calcBDMCommission, generateCurveData } from '../utils/commissionCalc.js';

export default function CommissionCalculatorTab() {
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
    setCalculated(calcBDMCommission({ role, rampMonth, monthlyTarget, actualMRR, dealCount, oneTimeRevenue, currencyCode, exchangeRate }));
  };

  const curveData = useMemo(generateCurveData, []);

  return (
    <div className="fade-in grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
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
          <div
            className={calculated.zone === "Accelerator" ? "fade-in celebrate" : "fade-in"}
            style={{
              ...cardStyle,
              borderTop: `4px solid ${calculated.zone === "Accelerator" ? COLORS.ceelo : calculated.zone === "Cap" ? COLORS.prince : calculated.zone === "Decelerator" ? COLORS.elton : COLORS.secondary}`,
            }}
          >
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
                      <ReferenceLine x={Math.min(Math.round(calculated.achievementPct), 200)} stroke={COLORS.hucknall} strokeWidth={2} label={{ value: pct(calculated.achievementPct), position: "top", style: { fontSize: 11, fill: COLORS.hucknall, fontWeight: 700 } }} />
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
