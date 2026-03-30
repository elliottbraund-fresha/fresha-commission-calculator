import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Calculator, Info, AlertTriangle, TrendingUp } from 'lucide-react';
import { COLORS, cardStyle, btnPrimary, InputField, SelectField, DualCurrency, ZoneBadge, CurrencySelector } from './shared.jsx';
import { fmt, pct } from '../utils/currencies.js';
import { calcBDMCommission, generateCurveData } from '../utils/commissionCalc.js';

export default function CommissionCalculatorTab() {
  const [role, setRole] = useState("BDM");
  const [rampMonth, setRampMonth] = useState("M2+");
  const [variablePay, setVariablePay] = useState(3000);
  const [monthlyTarget, setMonthlyTarget] = useState(10000);
  const [actualMRR, setActualMRR] = useState(8500);
  const [dealCount, setDealCount] = useState(5);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [oneTimeRevenue, setOneTimeRevenue] = useState(2000);
  const [calculated, setCalculated] = useState(null);

  const handleCalc = () => {
    setCalculated(calcBDMCommission({
      role, rampMonth, monthlyTarget, actualMRR,
      dealCount, oneTimeRevenue, variablePay,
      currencyCode, exchangeRate,
    }));
  };

  const curveData = useMemo(
    () => generateCurveData({ role, dealCount, threshold: 70, cap: 175 }),
    [role, dealCount]
  );

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Currency selector at the top */}
      <div style={{ ...cardStyle, padding: "16px 24px" }}>
        <CurrencySelector currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} />
      </div>

      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
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
          <InputField label="Monthly Variable Pay (USD)" value={variablePay} onChange={setVariablePay} prefix="$" />
          <InputField label="Monthly MRR Target (USD)" value={monthlyTarget} onChange={setMonthlyTarget} prefix="$" />
          <InputField label="Actual MRR Generated (USD)" value={actualMRR} onChange={setActualMRR} prefix="$" />
          <InputField label="Number of Deals Signed" value={dealCount} onChange={setDealCount} min={0} />
          <InputField label="One-Time Revenue Sold (USD)" value={oneTimeRevenue} onChange={setOneTimeRevenue} prefix="$" />
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
                      <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 4 }}>
                        {calculated.zone === "Threshold" || calculated.zone === "Decelerator" ? "Decelerator Multiplier" : "Accelerator Multiplier"}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.prince }}>
                        {calculated.zone === "Threshold" ? "â" : `${calculated.multiplier}x`}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 2 }}>
                        {calculated.multiplierLabel}
                      </div>
                    </div>
                  </div>

                  {/* Threshold not met warning */}
                  {calculated.zone === "Threshold" && (
                    <div style={{ padding: "14px 16px", background: `${COLORS.hucknall}10`, borderRadius: 8, fontSize: 13, color: COLORS.hucknall, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Threshold Not Reached</div>
                        <div>You have not earned commission as you are below the 70% threshold. You need <strong>{fmt(Math.ceil(calculated.mrrToThreshold))}</strong> more MRR to reach the threshold and start earning variable pay.</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                      <span style={{ color: COLORS.secondary, fontSize: 14 }}>Monthly Variable Pay</span>
                      <span style={{ fontWeight: 600, color: COLORS.dark }}>{fmt(calculated.variablePay, 2)}</span>
                    </div>
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

                  {/* Insight message */}
                  {calculated.insightMessage && (
                    <div style={{ marginTop: 16, padding: "14px 16px", background: calculated.zone === "Threshold" ? `${COLORS.hucknall}08` : calculated.zone === "Decelerator" ? `${COLORS.elton}10` : `${COLORS.ceelo}10`, borderRadius: 8, fontSize: 13, color: calculated.zone === "Threshold" ? COLORS.hucknall : calculated.zone === "Decelerator" ? COLORS.elton : COLORS.ceelo, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <TrendingUp size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>{calculated.insightMessage}</div>
                    </div>
                  )}

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
    </div>
  );
}
