import React, { useState } from 'react';
import { RotateCcw, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { COLORS, cardStyle, btnPrimary, InputField, DualCurrency, CurrencySelector } from './shared.jsx';
import { fmt, fmtLocal, pct } from '../utils/currencies.js';
import { calcRetention } from '../utils/retentionCalc.js';

export default function RetentionAdjustmentTab() {
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
    <div className="fade-in grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
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
          <div className="fade-in" style={{
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
                  <div style={{ color: COLORS.hucknall, fontWeight: 700, fontSize: 18, textAlign: "right" }}>
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
