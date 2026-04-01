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
              <strong>Personal Target Scale:</strong> {bdmCount === 0 ? "150%" : bdmCount <= 3 ? "80%" : bdmCount <= 6 ? "33%" : "0%"} of BDM target = {fmt(baseBDMTargetUSD * getTLPersonalPct(bdmCount))}
            </div>

            <div style={{ padding: "10px 16px", background: COLORS.light, borderRadius: 8, fontSize: 13, color: COLORS.secondary, marginBottom: 16 }}>
              <strong>TL Commission Rules:</strong> Threshold 80% | Decelerator 2x | Accelerator 2x | Cap 125%
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
                <div>Name</div><div>Target ({bdmTargetsInLocal && isLocal ? currencyCode : "USD"})</div><div>Actual ({bdmActualsInLocal && isLocal ? currencyCode : "USD"})</div>
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
                ÏÙ]
J_BÚ\ÓØØ[	
]Ý[O^ÞÈ\Ü^N^Ø\MX\Ú[Ü
_OX[Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KÝ\ÛÜÚ[\\Ü^N^[YÛ][\ÎÙ[\Ø\
_O[]\OHÚXÚØÞÚXÚÙY^ØU\Ù]Ò[ØØ[HÛÚ[ÙO^ÙHOÙ]U\Ù]Ò[ØØ[
K\Ù]ÚXÚÙY
_HÏ\Ù]È[ØÝ\[ÞPÛÙ_BÛX[X[Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KÝ\ÛÜÚ[\\Ü^N^[YÛ][\ÎÙ[\Ø\
_O[]\OHÚXÚØÞÚXÚÙY^ØPXÝX[Ò[ØØ[HÛÚ[ÙO^ÙHOÙ]PXÝX[Ò[ØØ[
K\Ù]ÚXÚÙY
_HÏXÝX[È[ØÝ\[ÞPÛÙ_BÛX[Ù]
_BÙ]
_BÙ]Ù]ËÊ\Ý[È
ßBÜ\Ý[	
]Û\ÜÓ[YO^Ü\Ý[ÛHOOHXØÙ[\]Ü\Ý[ÛHOOHØ\ÈYKZ[Ù[X]HYKZ[BÝ[O^ÞÂØ\Ý[KÜ\Ü
ÛÛY	Ü\Ý[ÛHOOHXØÙ[\]ÜÈÓÓÔËÙY[È\Ý[ÛHOOHØ\ÈÓÓÔË[ÙH\Ý[ÛHOOH]\Ù]ÈÓÓÔËÙY[È\Ý[ÛHOOHXÙ[\]ÜÈÓÓÔË[ÛÓÓÔËÙXÛÛ\_XÜÚ][Û[]]HÝ\ÝÎY[_BÜÚÝÐÛÛ]H	
]Ý[O^ÞÈÜÚ][ÛXÛÛ]HÜYYÚZYÚ
XÚÙÜÝ[[X\YÜYY[
LYË	ÐÓÓÔËÙY[ßK	ÐÓÓÔË[Ù_K	ÐÓÓÔË[ßK	ÐÓÓÔËÙY[ßJXXÚÙÜÝ[Ú^N	HL	H[[X][ÛÚ[[Y\K\ÈX\ÙKZ[[Ý][[]H_HÏ
_BÜ\Ý[[\Y\ÜØYÙHÈ
]Ý[O^ÞÈY[Î^[YÛÙ[\_O[ÈÚ^O^ÌÌHÛÛÜ^ÐÓÓÔË[Ù_HÏÝ[O^ÞÈÛÚ^NMÛÛÜÓÓÔË[ÙKÛÙZYÚ
X\Ú[ÜL_OÜ\Ý[[\Y\ÜØYÙ_OÜÙ]
H
]Ý[O^ÞÈ\Ü^N^\ÝYPÛÛ[ÜXÙKX]ÙY[[YÛ][\ÎÙ[\X\Ú[ÝÛN_OÝ[O^ÞÈÛÚ^NÛÙZYÚ
ÌÛÛÜÓÓÔË\ËX\Ú[_OX[HXY\Ý[ÏÚÛPYÙHÛO^Ü\Ý[Û_HÏÙ]ËÊ\ÚÛÝY]Ø\[È
ßBÜ\Ý[\ÚÛZ\ÜÙY	
]Ý[O^ÞÈY[ÎMMXÚÙÜÝ[	ÐÓÓÔËXÚÛ[LLÜ\Y]\ÎÛÚ^NLËÛÛÜÓÓÔËXÚÛ[X\Ú[ÝÛNM\Ü^N^[YÛ][\Î^\Ý\Ø\L_O[\X[ÛHÚ^O^ÌNHÝ[O^ÞÈ^Ú[ÎX\Ú[ÜH_HÏ]]Ý[O^ÞÈÛÙZYÚ
ÌX\Ú[ÝÛN
_O\ÚÛÝXXÚY
	JOÙ]]XÚY][Y[\ÈÜÝ
\Ý[XÚY][Y[Ý
_HÚXÚ\È[ÝÈH	H\ÚÛÈÛÛ[Z\ÜÚ[ÛX\Y[ÝHYYÙ]
X]ÙZ[
\Ý[Ý[\Ù]
H\Ý[Ý[XÝX[
J_H[ÜHTÈXXÚH\ÚÛÙ]Ù]Ù]
_BËÊØ\]Y\ÜØYÙH
ßBÜ\Ý[Ø\]	
]Ý[O^ÞÈY[ÎMMXÚÙÜÝ[ÓÓÔË[ÙLÜ\Y]\ÎÛÚ^NLËÛÛÜÓÓÔË[ÙKX\Ú[ÝÛNM\Ü^N^[YÛ][\ÎÙ[\Ø\L_O]Ø\Ú^O^ÌNHÏ]ÝÛÏØ\XXÚY
LIJKÜÝÛÏX^[][H\XXHX\[ÜÈXÚY]YXÚY][Y[ÜÝ
\Ý[XÚY][Y[Ý
_KÙ]Ù]
_B]Û\ÜÓ[YOHÜYMXÛÛÝ[O^ÞÈ\Ü^NÜYÜY[\]PÛÛ[[Î\X]

YHØ\MX\Ú[ÝÛN_OÖÂÈX[\ÛÛ[\Ù][YN]
\Ý[\ÛÛ[\Ù]
KÝX	ÊÙ]\ÛÛ[Ý
PÛÝ[
H
L
KÑ^Y

_IHÙH\Ù]KÈX[Ý[\Ù][YN]
\Ý[Ý[\Ù]
HKÈX[Ý[XÝX[[YN]
\Ý[Ý[XÝX[
HKÈX[XÚY][Y[[YNÝ
\Ý[XÚY][Y[Ý
KÛÛÜ\Ý[XÚY][Y[ÝHLÈÓÓÔËÙY[È\Ý[XÚY][Y[ÝHÈÓÓÔË[ÛÓÓÔËXÚÛ[KKX\

][KJHO
]Ù^O^Ú_HÝ[O^ÞÈY[ÎMXÚÙÜÝ[ÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\_O]Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_OÚ][KX[OÙ]]Ý[O^ÞÈÛÚ^NÛÙZYÚ
ÌÛÛÜ][KÛÛÜÓÓÔË\È_OÚ][K[Y_OÙ]Ú][KÝX	]Ý[O^ÞÈÛÚ^NLKÛÛÜÓÓÔËÙXÛÛ\KX\Ú[Ü_OÚ][KÝXOÙ]BÙ]
J_BÙ]]Ý[O^ÞÈ\Ü^NÜYÜY[\]PÛÛ[[ÎYYYYØ\MX\Ú[ÝÛN_O]Ý[O^ÞÈY[ÎMXÚÙÜÝ[ÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\_O]Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_O\XXH^OÙ]X[Ý\[ÞH\Ù^Ü\Ý[\XXT^_HÛÙO^ØÝ\[ÞPÛÙ_H]O^Ù^Ú[ÙT]_HÏÙ]]Ý[O^ÞÈY[ÎMXÚÙÜÝ[ÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\_O]Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_OÜ\Ý[ÛHOOH\ÚÛ\Ý[ÛHOOHXÙ[\]ÜÈXÙ[\]Ü\Ý[ÛHOOH]\Ù]ÈÛHXØÙ[\]ÜBÙ]]Ý[O^ÞÈÛÚ^NNÛÙZYÚ
ÌÛÛÜ\Ý[ÛHOOH]\Ù]ÈÓÓÔËÙY[ÈÓÓÔË[ÙH_OÜ\Ý[ÛHOOH\ÚÛÈH\Ý[ÛHOOH]\Ù]ÈL	H	Ü\Ý[][\Y\^BÙ]]Ý[O^ÞÈÛÚ^NLKÛÛÜÓÓÔËÙXÛÛ\KX\Ú[Ü_OÜ\Ý[][\Y\X[OÙ]Ù]]Ý[O^ÞÈY[ÎMXÚÙÜÝ[ÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\_O]Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_OÛÛ[Z\ÜÚ[ÛÙ]X[Ý\[ÞH\Ù^Ü\Ý[ÛÛ[Z\ÜÚ[ÛHÛÙO^ØÝ\[ÞPÛÙ_H]O^Ù^Ú[ÙT]_HÏÙ]]Ý[O^ÞÈY[ÎMXÚÙÜÝ[ÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\_O]Ý[O^ÞÈÛÚ^NLÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_O\ÜX[ÙHÛ\ÏÙ]X[Ý\[ÞH\Ù^Ü\Ý[\ÜX[ÙPÛ\ßHÛÙO^ØÝ\[ÞPÛÙ_H]O^Ù^Ú[ÙT]_HÏÙ]Ù]]Ý[O^ÞÈY[ÎXÚÙÜÝ[
\Ý[ÛHOOHXØÙ[\]Ü\Ý[ÛHOOH]\Ù]HÈ	ÐÓÓÔËÙY[ßLLXÓÓÔËYÚÜ\Y]\ÎL^[YÛÙ[\X\Ú[ÝÛN_O]Ý[O^ÞÈÛÚ^NLËÛÛÜÓÓÔËÙXÛÛ\KX\Ú[ÝÛN
_OÝ[^[Ý]Ù]X[Ý\[ÞH\Ù^Ü\Ý[Ý[TÑHÛÙO^ØÝ\[ÞPÛÙ_H]O^Ù^Ú[ÙT]_H\ÙHÏÙ]ÜÚÝÐÛÛ]H	
]Ý[O^ÞÈY[ÎMMXÚÙÜÝ[	ÐÓÓÔËÙY[ßLMXÜ\Y]\ÎÛÚ^NMÛÛÜÓÓÔËÙY[Ë^[YÛÙ[\ÛÙZYÚ
X\Ú[ÝÛN_OÛÛÜ][][ÛÈH[Ý\X[H\ÈXÝH\Ù]BÙ]
_BËÊ[X[HXZÙÝÛXH

È\ÊH
ßBÜ\Ý[PXZÙÝÛ[Ý	
]ÈÝ[O^ÞÈÛÚ^NMKÛÙZYÚ
ÌÛÛÜÓÓÔË\ËX\Ú[ÝÛNL_OX[HXZÙÝÛÚÏ]Ý[O^ÞÈÝ\ÝÖ]]È_OXHÝ[O^ÞÈÚYL	HÛÚ^NM_OXYÝ[O^ÞÈXÚÙÜÝ[ÓÓÔË[ÙL_OÖÈY[X\\Ù]XÝX[XÚY][Y[KX\
O
Ù^O^ÚHÝ[O^ÞÈY[ÎLM^[YÛYÛÙZYÚ
ÛÚ^NLÛÛÜÓÓÔË\ËÜ\ÝÛNÛÛY	ÐÓÓÔË[ÙMX_OÚOÝ
J_BÝÝXYÙOÜ\Ý[PXZÙÝÛX\

JHO
Ù^O^Ú_HÝ[O^ÞÂXÚÙÜÝ[\ÕX[SXYÈÓÓÔË[ÙLH	HOOHÈÓÓÔËYÚÓÓÔËÚ]K_OÝ[O^ÞÈY[ÎLMÛÙZYÚ\ÕX[SXYÈ
Ì
LÛÛÜ\ÕX[SXYÈÓÓÔË[ÙHÓÓÔË\È_OØ[Y_BÝÝ[O^ÞÈY[ÎLM_OÙ]
\Ù]
_OÝÝ[O^ÞÈY[ÎLM_OÙ]
XÝX[
_OÝÝ[O^ÞÈY[ÎLM_OÜ[Ý[O^ÞÈÛÙZYÚ
ÛÛÜXÚY][Y[HLÈÓÓÔËÙY[ÈXÚY][Y[H
\ÕX[SXYÈ
Ì
HÈÓÓÔË[ÛÓÓÔËXÚÛ[_OØ\Ù]ÈÝ
XÚY][Y[
HÐHBÜÜ[ÝÝ
J_BÝ[O^ÞÈXÚÙÜÝ[ÓÓÔË\È_OÝ[O^ÞÈY[ÎLMÛÙZYÚ
ÌÛÛÜÓÓÔËÚ]H_OÝ[ÝÝ[O^ÞÈY[ÎLMÛÙZYÚ
ÌÛÛÜÓÓÔËÚ]H_OÙ]
\Ý[Ý[\Ù]
_OÝÝ[O^ÞÈY[ÎLMÛÙZYÚ
ÌÛÛÜÓÓÔËÚ]H_OÙ]
\Ý[Ý[XÝX[
_OÝÝ[O^ÞÈY[ÎLM_OÜ[Ý[O^ÞÈÛÙZYÚ
ÌÛÛÜÓÓÔËÚ]H_OÜ\Ý[Ý[\Ù]ÈÝ
\Ý[XÚY][Y[Ý
HÐHBÜÜ[ÝÝÝÙOÝXOÙ]Ù]
_BÏ
_BÙ]
_BÙ]
NÂB
