import React, { useState } from 'react';
import { Users, Info, AlertTriangle, Award } from 'lucide-react';
import { COLORS, cardStyle, btnPrimary, inputStyle, InputField, SelectField, DualCurrency, ZoneBadge, CurrencySelector } from './shared.jsx';
import { fmt, pct } from '../utils/currencies.js';
import { calcTLCommission, getTLPersonalPct } from '../utils/teamLeadCalc.js';

export default function TeamLeadCalculatorTab() {
  const [rampMonth, setRampMonth] = useState("M1+");
  const [variablePay, setVariablePay] = useState(5000);
  const [baseBDMTarget, setBaseBDMTarget] = useState(10000);
  const [bdmCount, setBdmCount] = useState(3);
  const [bdmTargets, setBdmTargets] = useState([10000, 10000, 10000]);
  const [bdmActuals, setBdmActuals] = useState([9000, 11000, 8000]);
  const [bdmNames, setBdmNames] = useState(["", "", ""]);
  const [tlPersonalMRR, setTlPersonalMRR] = useState(6000);
  const [tlOneTimeRevenue, setTlOneTimeRevenue] = useState(3000);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [result, setResult] = useState(null);

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
    setResult(calcTLCommission({
      rampMonth, baseBDMTarget, bdmCount, bdmTargets, bdmActuals,
      bdmNames, tlPersonalMRR, tlOneTimeRevenue, variablePay, exchangeRate,
    }));
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
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
            <InputField label="Monthly Variable Pay (USD)" value={variablePay} onChange={setVariablePay} prefix="$" />
            <InputField label="Number of Quota-Carrying BDMs" value={bdmCount} onChange={handleBdmCountChange} min={0} />

            <div style={{ padding: "12px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16 }}>
              <strong>Personal Target Scale:</strong> {bdmCount === 0 ? "150%" : bdmCount <= 3 ? "80%" : bdmCount <= 6 ? "33%" : "0%"} of BDM target = {fmt(baseBDMTarget * getTLPersonalPct(bdmCount))}
            </div>

            <div style={{ padding: "10px 16px", background: COLORS.light, borderRadius: 8, fontSize: 13, color: COLORS.secondary, marginBottom: 16 }}>
              <strong>TL Commission Rules:</strong> Threshold 80% | Decelerator 2x | Accelerator 2x | Cap 125%
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
              <div style={{ display: "grid", gridTemplateColumns: "minmax(80px, 1fr) 1fr 1fr", gap: 8, fontSize: 12, fontWeight: 600, color: COLORS.secondary, paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}` }}>
                <div>Name</div><div>Target (USD)</div><div>Actual (USD)</div>
              </div>
              {Array.from({ length: bdmCount }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(80px, 1fr) 1fr 1fr", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={bdmNames[i] || ""}
                    onChange={e => { const v = [...bdmNames]; v[i] = e.target.value; setBdmNames(v); }}
                    placeholder={`BDM #${i + 1}`}
                    style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                    aria-label={`BDM ${i + 1} Name`}
                  />
                  <input
                    type="number"
                    value={bdmTargets[i] ?? baseBDMTarget}
                    onChange={e => { const v = [...bdmTargets]; v[i] = Number(e.target.value); setBdmTargets(v); }}
                    style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                    aria-label={`BDM ${i + 1} Target`}
                  />
                  <input
                    type="number"
                    value={bdmActuals[i] ?? 0}
                    onChange={e => { const v = [...bdmActuals]; v[i] = Number(e.target.value); setBdmActuals(v); }}
                    style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                    aria-label={`BDM ${i + 1} Actual`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className={result.zone === "Accelerator" ? "fade-in celebrate" : "fade-in"}
          style={{
            ...cardStyle,
            borderTop: `4px solid ${result.zone === "Accelerator" ? COLORS.ceelo : result.zone === "Cap" ? COLORS.prince : result.zone === "Decelerator" ? COLORS.elton : COLORS.secondary}`,
          }}
        >
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

              {/* Threshold not met warning */}
              {result.thresholdMissed && (
                <div style={{ padding: "14px 16px", background: `${COLORS.hucknall}10`, borderRadius: 8, fontSize: 13, color: COLORS.hucknall, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Threshold Not Reached (80%)</div>
                    <div>Achievement is {pct(result.achievementPct)} which is below the 80% threshold. No commission earned. You need {fmt(Math.ceil(result.totalTarget * 0.8 - result.totalActual))} more MRR to reach the threshold.</div>
                  </div>
                </div>
              )}

              {/* Cap hit message */}
              {result.capHit && (
                <div style={{ padding: "14px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <Award size={18} />
                  <div><strong>Cap reached (125%).</strong> Maximum variable earnings achieved. Achievement: {pct(result.achievementPct)}.</div>
                </div>
              )}

              <div className="grid-4-col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>Variable Pay</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark }}>{fmt(result.variablePay, 2)}</div>
                </div>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>
                    {result.zone === "Threshold" || result.zone === "Decelerator" ? "Decelerator" : "Accelerator"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.prince }}>
                    {result.zone === "Threshold" ? "â" : `${result.multiplier}x`}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 2 }}>{result.multiplierLabel}</div>
                </div>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>TL Commission</div>
                  <DualCurrency usd={result.commission} code={currencyCode} rate={exchangeRate} />
                </div>
                <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.secondary, marginBottom: 6 }}>Performance Bonus</div>
                  <DualCurrency usd={result.performanceBonus} code={currencyCode} rate={exchangeRate} />
                </div>
              </div>

              <div style={{ padding: 20, background: result.zone === "Accelerator" ? `${COLORS.ceelo}11` : COLORS.light, borderRadius: 10, textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: COLORS.secondary, marginBottom: 6 }}>Total Payout</div>
                <DualCurrency usd={result.totalUSD} code={currencyCode} rate={exchangeRate} large />
              </div>

              {/* Full team breakdown table (TL + BDMs) */}
              {result.bdmBreakdown.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 12 }}>Team Breakdown</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: COLORS.prince20 }}>
                          {["Member", "Target", "Actual", "Achievement"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.bdmBreakdown.map((b, i) => (
                          <tr key={i} style={{
                            background: b.isTeamLead ? COLORS.prince20 : i % 2 === 0 ? COLORS.light : COLORS.white,
                          }}>
                            <td style={{ padding: "10px 14px", fontWeight: b.isTeamLead ? 700 : 500, color: b.isTeamLead ? COLORS.prince : COLORS.dark }}>
                              {b.name}
                            </td>
                            <td style={{ padding: "10px 14px" }}>{fmt(b.target)}</td>
                            <td style={{ padding: "10px 14px" }}>{fmt(b.actual)}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ fontWeight: 600, color: b.achievement >= 100 ? COLORS.ceelo : b.achievement >= (b.isTeamLead ? 80 : 70) ? COLORS.elton : COLORS.hucknall }}>
                                {b.target > 0 ? pct(b.achievement) : "N/A"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
