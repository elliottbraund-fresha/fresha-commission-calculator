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
  dealCount, oneTimeRevenue, variablePay,
  currencyCode, exchangeRate,
}) {
  const result = {
    achievementPct: 0, zone: "Threshold", multiplier: 1.0,
    multiplierLabel: "N/A",
    baseCommission: 0, performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    effectiveTarget: monthlyTarget, rampMessage: null,
    variablePay: variablePay || 0,
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

  let effectiveTarget = monthlyTarget;
  if (rampMonth === "M1") {
    effectiveTarget = monthlyTarget * 0.5;
    result.rampMessage = "M1: Target at 50%. Accelerators apply once full target is exceeded.";
  }
  result.effectiveTarget = effectiveTarget;

  if (effectiveTarget <= 0 || variablePay <= 0) return result;

  const achievement = (actualMRR / effectiveTarget) * 100;
  result.achievementPct = achievement;

  if (achievement < 70) {
    result.zone = "Threshold";
    result.baseCommission = 0;
    result.multiplier = 0;
    result.multiplierLabel = "Below Threshold";
    result.mrrToThreshold = effectiveTarget * 0.7 - actualMRR;
    result.earningsAtThreshold = 0;
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    result.insightMessage = "You have not reached the 70% threshold. You need " + Math.ceil(result.mrrToThreshold) + " more MRR to start earning commission. Reaching 100% target earns you the full " + variablePay.toFixed(2) + " variable pay.";
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    const payoutPct = (achievement - 70) / 30;
    result.baseCommission = variablePay * payoutPct;
    result.multiplier = 2;
    result.multiplierLabel = "Decelerator 2x";
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    const additionalEarnings = result.earningsAtTarget - result.baseCommission;
    result.insightMessage = "You need " + Math.ceil(result.mrrToTarget) + " more MRR to reach 100% target. This would earn you an additional " + additionalEarnings.toFixed(2) + " in variable pay (total " + variablePay.toFixed(2) + ").";
  } else {
    result.baseCommission = variablePay;
    const cappedAchievement = Math.min(achievement, 175);
    const aboveTarget = cappedAchievement - 100;
    const accelMultiplier = getAcceleratorMultiplier(dealCount);
    result.multiplier = accelMultiplier;
    result.multiplierLabel = "Accelerator " + accelMultiplier + "x";
    const acceleratorBonus = (aboveTarget / 100) * variablePay * accelMultiplier;
    result.baseCommission += acceleratorBonus;
    result.zone = achievement >= 175 ? "Cap" : "Accelerator";

    if (result.zone === "Cap") {
      result.insightMessage = "You have hit the 175% cap. Maximum variable earnings achieved.";
    } else {
      if (dealCount >= 8) {
        result.mrrToCap = effectiveTarget * 1.75 - actualMRR;
        result.insightMessage = "You have maxed the accelerator at " + accelMultiplier + "x. You need " + Math.ceil(result.mrrToCap) + " more MRR to hit the 175% cap.";
      } else {
        const avgMRRPerDeal = dealCount > 0 ? actualMRR / dealCount : 0;
        if (avgMRRPerDeal > 0) {
          const newDealCount = dealCount + 1;
          const newActualMRR = actualMRR + avgMRRPerDeal;
          const newAchievement = Math.min((newActualMRR / effectiveTarget) * 100, 175);
          const newAbove = newAchievement - 100;
          const newAccel = getAcceleratorMultiplier(newDealCount);
          const newCommission = variablePay + (newAbove / 100) * variablePay * newAccel;
          result.additionalEarningsOneMoreDeal = newCommission - result.baseCommission;
          result.insightMessage = "One more deal at your average MRR of " + Math.round(avgMRRPerDeal) + " would earn you an additional " + result.additionalEarningsOneMoreDeal.toFixed(2) + " (new accelerator: " + newAccel + "x).";
        }
      }
    }
  }

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

export function generateCurveData({ role = "BDM", dealCount = 5, threshold = 70, cap = 175 } = {}) {
  const isBDM = ["BDE", "BDM", "Snr BDM"].includes(role);
  const accelMultiplier = isBDM ? getAcceleratorMultiplier(dealCount) : 2.0;
  const decelRange = 100 - threshold;

  const data = [];
  for (let x = 0; x <= 200; x += 1) {
    let y = 0;
    if (x < threshold) {
      y = 0;
    } else if (x <= 100) {
      const progress = (x - threshold) / decelRange;
      y = progress * 100;
    } else if (x <= cap) {
      const above = x - 100;
      y = 100 + above * accelMultiplier;
    } else {
      const maxAbove = cap - 100;
      y = 100 + maxAbove * accelMultiplier;
    }
    data.push({ achievement: x, earnings: Math.round(y * 10) / 10 });
  }
  return data;
}
