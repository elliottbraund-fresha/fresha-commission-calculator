export const ACCELERATOR_TABLE = [
  { deals: "1–3", multiplier: 1.0 },
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

export function calcBDMCommission({
  role, rampMonth, monthlyTarget, actualMRR,
  dealCount, oneTimeRevenue, currencyCode, exchangeRate,
}) {
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

  const targetCommission = effectiveTarget;

  if (achievement < 70) {
    result.zone = "Threshold";
    result.baseCommission = 0;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    const progressInZone = (achievement - 70) / 30;
    const deceleratedProgress = Math.pow(progressInZone, 2);
    result.baseCommission = targetCommission * deceleratedProgress;
  } else {
    result.baseCommission = targetCommission;

    const cappedAchievement = Math.min(achievement, 175);
    const aboveTarget = cappedAchievement - 100;

    const accelMultiplier = getAcceleratorMultiplier(dealCount);
    result.acceleratorMultiplier = accelMultiplier;

    const acceleratorBonus = (aboveTarget / 100) * targetCommission * accelMultiplier;
    result.baseCommission += acceleratorBonus;

    result.zone = achievement >= 175 ? "Cap" : "Accelerator";
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

export function generateCurveData() {
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
      y = 100 + above * 1.5;
    } else {
      y = 100 + 75 * 1.5;
    }
    data.push({ achievement: x, earnings: Math.round(y * 10) / 10 });
  }
  return data;
}
