export const ACCELERATOR_TABLE = [
  { deals: "1-3", multiplier: 1.0 },
  { deals: "4", multiplier: 1.2 },
  { deals: "5", multiplier: 1.4 },
  { deals: "6", multiplier: 1.6 },
  { deals: "7", multiplier: 1.8 },
  { deals: "8+", multiplier: 2.0 },
];

export function getAcceleratorMultiplier(deals) {
  if (deals <= 3) return 1.0;
  if (deals === 4) return 1.2;
  if (deals === 5) return 1.4;
  if (deals === 6) return 1.6;
  if (deals === 7) return 1.8;
  return 2.0;
}

/**
 * Calculate BDM commission.
 * variablePay = monthly variable pay the user enters.
 * Commission is based on variablePay as 100% at-target earnings.
 * Decelerator is a standard 2x (linear) between threshold and target.
 */
export function calcBDMCommission({
  role, rampMonth, monthlyTarget, actualMRR,
  dealCount, oneTimeRevenue, variablePay,
  currencyCode, exchangeRate,
}) {
  const result = {
    achievementPct: 0, zone: "Threshold", multiplier: 1.0,
    multiplierLabel: "N/A",
    baseCommission: 0, performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    effectiveTarget: monthlyTarget, rampMessage: null,
    variablePay: variablePay || 0,
    // Insight fields
    mrrToTarget: 0, mrrToThreshold: 0,
    earningsAtTarget: 0, earningsAtThreshold: 0,
    additionalEarningsOneMoreDeal: 0,
    mrrToCap: 0,
    insightMessage: "",
  };

  if (rampMonth === "M0") {
    result.rampMessage = "No commission earned during M0 (training month).";
    result.zone = "No Commission";
    return result;
  }

  // For M1 ramp, the user enters the 50% ramp target directly.
  
d!
data_to_visualization.
 * dealCount: for BDM roles, determines the accelerator multiplier.
 * threshold/cap: configurable per role.
  
d!
data_to_visualization.
 * dealCount: for BDM roles, determines the accelerator multiplier.
 * threshold/cap: configurable per role.
  
d!
data_to_visualization.
 * dealCount: for BDM roles, determines the accelerator multiplier.
 * threshold/cap: configurable per role.
  
d!
data_to_visualizationthreshold = 70, cap = 175, rampMonth = "M2+" } = {}) {
  const isBDM = ["BDE", "BDM", "Snr BDM"].includes(role);
  const accelMultiplier = isBDM ? getAcceleratorMultiplier(dealCount) : 2.0;
  const isM1 = rampMonth === "M1";

  // For M1 ramp: achievement is vs ramp target (50%).
  // Full target = 200% of ramp target. Accelerators unlock at 200%.
  // Cap = 175% of full target = 350% of ramp target.
  const fullTargetPct = isM1 ? 200 : 100;
  const accelCapPct = isM1 ? 350 : cap;
  const maxX = isM1 ? 400 : 200;

  const data = [];
  for (let x = 0; x <= maxX; x += 1) {
    let y = 0;
    if (x < threshold) {
      y = 0;
    } else if (x <= 100) {
      // 2x decelerator: earnings% = 100 - (100 - x) * 2
      const decelMultiplier = 2;
      y = Math.max(0, 100 - (100 - x) * decelMultiplier);
    } else if (isM1 && x <= fullTargetPct) {
      // M1: flat at 100% variable until full target is reached
      y = 100;
    } else if (x <= accelCapPct) {
      const above = x - fullTargetPct;
      y = 100 + above * accelMultiplier;
    } else {
      const maxAbove = accelCapPct - fullTargetPct;
      y = 100 + maxAbove * accelMultiplier;
    }
    data.push({ achievement: x, earnings: Math.round(y * 10) / 10 });
  }
  return data;
}
