import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { ChevronRight, TrendingUp, TrendingDown, Zap, Shield, Info, Award, AlertTriangle } from 'lucide-react';
import { COLORS, cardStyle, SelectField } from './shared.jsx';
import { ACCELERATOR_TABLE, generateCurveData, getAcceleratorMultiplier } from '../utils/commissionCalc.js';

const ROLE_CONFIG = {
  "BDE":      { threshold: 70, cap: 175, decel: "2x", accel: "Deal count based" },
  "BDM":      { threshold: 70, cap: 175, decel: "2x", accel: "Deal count based" },
  "Snr BDM":  { threshold: 70, cap: 175, decel: "2x", accel: "Deal count based" },
  "TL BDM":   { threshold: 80, cap: 125, decel: "2x", accel: "2x" },
  "Head of BDM": { threshold: 80, cap: 125, decel: "2x", accel: "2x" },
  "VP of Sales": { threshold: 80, cap: 112.5, decel: "4x", accel: "BDMs on target based" },
};

export default function CommissionStructure() {
  const [selectedRole, setSelectedRole] = useState("BDM");
  const [selectedDeals, setSelectedDeals] = useState(5);

  const roleConfig = ROLE_CONFIG[selectedRole];
  const isBDMRole = ["BDE", "BDM", "Snr BDM"].includes(selectedRole);
  const accelMultiplier = isBDMRole ? getAcceleratorMultiplier(selectedDeals) : 2.0;

  const curveData = useMemo(
    () => generateCurveData({
      role: selectedRole,
      dealCount: selectedDeals,
      threshold: roleConfig.threshold,
      cap: roleConfig.cap,
    }),
    [selectedRole, selectedDeals, roleConfig.threshold, roleConfig.cap]
  );

  // Calculate max earnings % for the Y axis
  const maxEarnings = curveData.length > 0 ? Math.max(...curveData.map(d => d.earnings)) : 250;

  const concepts = [
    { title: "Threshold", range: `${roleConfig.threshold}%`, desc: `Minimum attainment before any commission is earned. Below ${roleConfig.threshold}%, variable earnings = $0.`, icon: <Shield size={22} />, color: COLORS.secondary },
    { title: "Decelerator", range: `${roleConfig.threshold}% - 100%`, desc: `Above threshold but below target. A standard 2x decelerator applies - for every 1% below target, you lose 2% of variable pay. Linear from 0% payout at threshold to 100% at target.`, icon: <TrendingDown size={22} />, color: COLORS.elton },
    { title: "Accelerator", range: `100% - ${roleConfig.cap}%`, desc: isBDMRole ? `Above target. The accelerator multiplier depends on deal count (currently ${accelMultiplier}x for ${selectedDeals} deals). Rewards over-performance.` : `Above target. A fixed ${roleConfig.accel} accelerator applies to reward over-performance.`, icon: <TrendingUp size={22} />, color: COLORS.ceelo },
    { title: "Cap", range: `${roleConfig.cap}%`, desc: "Maximum commission ceiling. Earnings flatten beyond this point regardless of further attainment.", icon: <Zap size={22} />, color: COLORS.prince },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Definitions */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={20} color={COLORS.prince} /> Commission Definitions
        </h2>
        <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
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

      {/* Curve with dropdowns */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, margin: 0 }}>Commission Curve</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <div style={{ minWidth: 140 }}>
              <SelectField label="Job Title" value={selectedRole} onChange={setSelectedRole} options={
                Object.keys(ROLE_CONFIG).map(r => ({ value: r, label: r }))
              } />
            </div>
            {isBDMRole && (
              <div style={{ minWidth: 130 }}>
                <SelectField label="Deal Count" value={String(selectedDeals)} onChange={v => setSelectedDeals(Number(v))} options={[
                  { value: "1", label: "1-3 deals" },
                  { value: "4", label: "4 deals" },
                  { value: "5", label: "5 deals" },
                  { value: "6", label: "6 deals" },
                  { value: "7", label: "7 deals" },
                  { value: "8", label: "8+ deals" },
                ]} />
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "8px 16px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={16} />
          {selectedRole}: Threshold {roleConfig.threshold}% | Decelerator 2x | Accelerator {isBDMRole ? `${accelMultiplier}x (${selectedDeals} deals)` : roleConfig.accel} | Cap {roleConfig.cap}%
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={curveData} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.prince} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.prince} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="achievement" tickFormatter={v => `${v}%`} label={{ value: "Achievement to Goal", position: "insideBottom", offset: -5, style: { fontSize: 12, fill: COLORS.secondary } }} />
            <YAxis tickFormatter={v => `${v}%`} domain={[0, Math.ceil(maxEarnings / 50) * 50]} label={{ value: "Variable Earnings %", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: COLORS.secondary } }} />
            <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Earnings"]} labelFormatter={l => `Achievement: ${l}%`} />
            <ReferenceArea x1={0} x2={roleConfig.threshold} fill="#F3F4F6" fillOpacity={0.8} />
            <ReferenceArea x1={roleConfig.threshold} x2={100} fill={COLORS.elton} fillOpacity={0.07} />
            <ReferenceArea x1={100} x2={roleConfig.cap} fill={COLORS.ceelo} fillOpacity={0.07} />
            <ReferenceArea x1={roleConfig.cap} x2={200} fill={COLORS.prince20} fillOpacity={0.5} />
            <ReferenceLine x={roleConfig.threshold} stroke={COLORS.hucknall} strokeDasharray="4 4" label={{ value: `${roleConfig.threshold}% Threshold`, position: "top", style: { fontSize: 11, fill: COLORS.hucknall } }} />
            <ReferenceLine x={100} stroke={COLORS.ceelo} strokeDasharray="4 4" label={{ value: "100% Target", position: "top", style: { fontSize: 11, fill: COLORS.ceelo } }} />
            <ReferenceLine x={roleConfig.cap} stroke={COLORS.prince} strokeDasharray="4 4" label={{ value: `${roleConfig.cap}% Cap`, position: "top", style: { fontSize: 11, fill: COLORS.prince } }} />
            <Area type="monotone" dataKey="earnings" stroke={COLORS.prince} strokeWidth={3} fill="url(#curveGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: `No Commission (0-${roleConfig.threshold}%)`, color: "#D1D5DB" },
            { label: `Decelerator (${roleConfig.threshold}-100%)`, color: COLORS.elton },
            { label: `Accelerator (100-${roleConfig.cap}%)`, color: COLORS.ceelo },
            { label: `Cap (${roleConfig.cap}%+)`, color: COLORS.prince },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.secondary }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} /> {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Ramp Schedule */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Ramp Schedule</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14 }}>
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
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: COLORS.prince20, borderRadius: 8, fontSize: 13, color: COLORS.prince, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={16} /> BDM hires should always start on the First Monday of the Month.
        </div>
      </div>

      {/* Accelerator Chevrons */}
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
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{item.multiplier}x</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{item.deals} deals</div>
                </div>
                {i < ACCELERATOR_TABLE.length - 1 && (
                  <ChevronRight size={20} color={COLORS.prince60} style={{ margin: "0 4px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bonus Structure */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Award size={20} color={COLORS.ceelo} /> BDM Performance Bonus Structure
        </h2>
        <p style={{ fontSize: 14, color: COLORS.secondary, marginBottom: 16, lineHeight: 1.5 }}>
          Separate from MRR commission. BDMs earn a bonus on one-time revenue items (Account Setup Packages, Data Migration Packages, Photography Services, Terminal Hardware).
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14 }}>
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
              <tr>
                <td colSpan={3} style={{ padding: "12px 16px", fontWeight: 600, color: COLORS.elton }}><AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Kosovo (Regional Exception)</td>
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>0% / 10%</td>
              </tr>
              <tr style={{ background: COLORS.light }}>
                <td colSpan={3} style={{ padding: "12px 16px", fontWeight: 600, color: COLORS.elton }}><AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />GCC (Regional Exception)</td>
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>10% / 20%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Thresholds by Role */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Thresholds & Multipliers by Role</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14 }}>
            <thead>
              <tr style={{ background: COLORS.prince20 }}>
                {["Role", "Threshold", "Cap", "Decelerator", "Accelerator"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.dark, borderBottom: `2px solid ${COLORS.prince40}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_CONFIG).map(([role, cfg], i) => (
                <tr key={role} style={{ background: i % 2 === 1 ? COLORS.light : COLORS.white }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{role}</td>
                  <td style={{ padding: "12px 16px" }}>{cfg.threshold}%</td>
                  <td style={{ padding: "12px 16px" }}>{cfg.cap}%</td>
                  <td style={{ padding: "12px 16px" }}>{cfg.decel}</td>
                  <td style={{ padding: "12px 16px" }}>{cfg.accel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
