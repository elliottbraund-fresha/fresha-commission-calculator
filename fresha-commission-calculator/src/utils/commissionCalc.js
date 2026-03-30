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

  let effectiveTarget = monthlyTarget;
  if (rampMonth === "M1") {
    effectiveTarget = monthlyTarget * 0.5;
    result.rampMessage = "M1: Target at 50%. Accelerators apply once full target is exceeded.";
  }
  result.effectiveTarget = effectiveTarget;

  if (effectiveTarget <= 0 || variablePay <= 0) return result;

  const achievement = (actualMRR / effectiveTarget) * 100;
  result.achievementPct = achievement;

  // Decelerator is standard 2x: at threshold (70%) you earn 0%, at 100% you earn 100% of variable.
  // Linear interpolation: earnings% = (achievement - 70) / 30 * 100, but multiplied by 2x decel factor.
  // Actually, 2x decelerator means: for every 1% below target, you lose 2% of variable pay.
  // At 100% achievement = 100% variable. At 70% achievement (30% below) = 100% - 30%*2 = 40%...
  // Wait - let me reconsider. Standard 2x decelerator:
  // The payout at threshold (70%) = 0. At target (100%) = 100% of variable.
  // The "2x" means the deceleration rate is 2x the standard rate.
  // Linear from 70% to 100%: payout = (achievement - 70) / 30 * variablePay
  // This gives 0 at 70% and variablePay at 100%. The "2x" refers to the fact that
  // for the 30% range below target, you only earn from 0 to 100% (not 70% to 100%).

  if (achievement < 70) {
    result.zone = "Threshold";
    result.baseCommission = 0;
    result.multiplier = 0;
    result.multiplierLabel = "Below Threshold";
    // Calculate how much MRR needed to reach threshold
    result.mrrToThreshold = effectiveTarget * 0.7 - actualMRR;
    result.earningsAtThreshold = 0; // at exactly 70% you just start earning
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    result.insightMessage = `You have not reached the 70% threshold. You need ${Math.ceil(result.mrrToThreshold)} more MRR to start earning commission. Reaching the threshold earns you your first variable pay. Reaching 100% target earns you the full ${variablePay.toFixed(2)} variable pay.`;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    // Standard 2x decel: linear from 0% at 70% to 100% at 100%
    const payoutPct = (achievement - 70) / 30;
    result.baseCommission = variablePay * payoutPct;
    result.multiplier = 2;
    result.multiplierLabel = "Decelerator 2x";
    // Insight: how much more MRR to reach target
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    const additionalEarnings = result.earningsAtTarget - result.baseCommission;
    result.insightMessage = `You need ${Math.ceil(result.mrrToTarget)} more MRR to reach 100% target. This would earn you an additional ${additionalEarnings.toFixed(2)} in variable pay (total ${variablePay.toFixed(2)}).`;
  } else {
    // Above target - accelerator zone
    result.baseCommission = variablePay; // 100% of variable at target

    const cappedAchievement = Math.min(achievement, 175);
    const aboveTarget = cappedAchievement - 100;

    const accelMultiplier = getAcceleratorMultiplier(dealCount);
    result.multiplier = accelMultiplier;
    result.multiplierLabel = `Accelerator ${accelMultiplier}x`;

    const acceleratorBonus = (aboveTarget / 100) * variablePay * accelMultiplier;
    result.baseCommission += acceleratorBonus;

    // Cap requires BOTH 175%+ achievement AND 8+ deals (2x accelerator)
    const isFullCap = achievement >= 175 && dealCount >= 8;
    result.zone = isFullCap ? "Cap" : "Accelerator";

    // Insights for above-target
    if (isFullCap) {
      result.insightMessage = `You have hit the 175% cap with 8+ deals (2x accelerator). Maximum variable earnings achieved.`;
    } else if (achievement >= 175 && dealCount < 8) {
      // Achievement is maxed but accelerator is not - more deals needed
      const nextAccel = getAcceleratorMultiplier(dealCount + 1);
      const maxAbove = 175 - 100;
      const currentCommission = result.baseCommission;
      const newCommission = variablePay + (maxAbove / 100) * variablePay * nextAccel;
      const additionalEarnings = newCommission - currentCommission;
      result.insightMessage = `You have reached 175% achievement but your accelerator is ${accelMultiplier}x (${dealCount} deals). You can only unlock more commission by signing more deals. One more deal would increase your accelerator to ${nextAccel}x, earning you an additional ${additionalEarnings.toFixed(2)}.`;
    } else {
      // Below 175% achievement
      if (dealCount >= 8) {
        result.mrrToCap = effectiveTarget * 1.75 - actualMRR;
        result.insightMessage = `You have maxed the accelerator at ${accelMultiplier}x. You need ${Math.ceil(result.mrrToCap)} more MRR to hit the 175% cap.`;
      } else {
        // Calculate value of one more deal at average MRR
        const avgMRRPerDeal = dealCount > 0 ? actualMRR / dealCount : 0;
        if (avgMRRPerDeal > 0) {
          const newDealCount = dealCount + 1;
          const newActualMRR = actualMRR + avgMRRPerDeal;
          const newAchievement = Math.min((newActualMRR / effectiveTarget) * 100, 175);
          const newAbove = newAchievement - 100;
          const newAccel = getAcceleratorMultiplier(newDealCount);
          const newCommission = variablePay + (newAbove / 100) * variablePay * newAccel;
          result.additionalEarningsOneMoreDeal = newCommission - result.baseCommission;
          result.insightMessage = `One more deal at your average MRR of ${Math.round(avgMRRPerDeal)} would earn you an additional ${result.additionalEarningsOneMoreDeal.toFixed(2)} (new accelerator: ${newAccel}x).`;
        }
      }
    }
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

/**
 * Generate curve data for visualization.
 * role: "BDM" uses deal-count-based accelerator, others use fixed 2x.
 * dealCount: for BDM roles, determines the accelerator multiplier.
 * threshold/cap: configurable per role.
 */
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
      // Standard 2x decelerator: linear from 0 at threshold to 100 at target
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
