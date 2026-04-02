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
  role, rampMonth, monthlyTarget: rawMonthlyTarget, actualMRR: rawActualMRR,
  dealCount: rawDealCount, oneTimeRevenue: rawOneTimeRevenue, variablePay: rawVariablePay,
  currencyCode, exchangeRate,
}) {
  // Sanitize all numeric inputs — empty strings or NaN become 0
  const monthlyTarget = Number(rawMonthlyTarget) || 0;
  const actualMRR = Number(rawActualMRR) || 0;
  const dealCount = Number(rawDealCount) || 0;
  const oneTimeRevenue = Number(rawOneTimeRevenue) || 0;
  const variablePay = Number(rawVariablePay) || 0;

  const result = {
    achievementPct: 0, zone: "Threshold", multiplier: 1.0,
    multiplierLabel: "N/A",
    baseCommission: 0, performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    effectiveTarget: monthlyTarget, rampMessage: null,
    variablePay: variablePay,
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
  // The full target is 2x the entered value.
  let effectiveTarget = monthlyTarget; // This is the ramp target (what they're measured against)
  let fullTarget = monthlyTarget; // For accelerator unlock check
  if (rampMonth === "M1") {
    fullTarget = monthlyTarget * 2; // Full target is 2x the entered ramp target
    result.rampMessage = `M1 Ramp: Your reduced target is $${monthlyTarget.toFixed(2)} (50% of full target $${fullTarget.toFixed(2)}). Accelerators apply once the full target is exceeded.`;
  }
  result.effectiveTarget = effectiveTarget;

  if (effectiveTarget <= 0 || variablePay <= 0) return result;

  const achievement = (actualMRR / effectiveTarget) * 100;
  result.achievementPct = achievement;

  // 2x Decelerator: for every 1% below target, lose 2% of variable pay.
  // Formula: variableEarnings% = 100 - (100 - achievement) * 2
  // At 100% achievement = 100% variable. At 90% = 80%. At 70% threshold = 40%.
  // Below 70% threshold = no commission at all.

  if (achievement < 70) {
    result.zone = "Threshold";
    result.baseCommission = 0;
    result.multiplier = 0;
    result.multiplierLabel = "Below Threshold";
    result.mrrToThreshold = effectiveTarget * 0.7 - actualMRR;
    result.earningsAtThreshold = variablePay * (100 - (100 - 70) * 2) / 100; // 40% at threshold
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    result.insightMessage = `You have not reached the 70% threshold. You need $${result.mrrToThreshold.toFixed(2)} more MRR to start earning commission. At threshold you would earn $${result.earningsAtThreshold.toFixed(2)} (40% of variable). At 100% target you earn the full $${variablePay.toFixed(2)}.`;
  } else if (achievement <= 100) {
    result.zone = achievement === 100 ? "At Target" : "Decelerator";
    // 2x decel: earnings% = 100 - (100 - achievement) * 2
    const decelMultiplier = 2;
    const variableEarningsPct = Math.max(0, 100 - (100 - achievement) * decelMultiplier);
    const payoutPct = variableEarningsPct / 100;
    result.baseCommission = variablePay * payoutPct;
    result.multiplier = 2;
    result.multiplierLabel = achievement === 100 ? "At Target" : "Decelerator 2x";
    result.variableEarningsPct = variableEarningsPct;
    result.mrrToTarget = effectiveTarget - actualMRR;
    result.earningsAtTarget = variablePay;
    const additionalEarnings = result.earningsAtTarget - result.baseCommission;
    if (achievement === 100) {
      result.insightMessage = `You have hit 100% target. Your full variable pay of $${variablePay.toFixed(2)} is earned.`;
    } else {
      result.insightMessage = `Your variable earnings are ${variableEarningsPct.toFixed(1)}% (2x decel applied). You need $${result.mrrToTarget.toFixed(2)} more MRR to reach 100% target for an additional $${additionalEarnings.toFixed(2)} (total $${variablePay.toFixed(2)}).`;
    }
  } else {
    // Above target - accelerator zone
    result.baseCommission = variablePay; // 100% of variable at target

    // M1 ramp: accelerator not unlocked until full target is achieved
    const actualFullTargetAchievement = (actualMRR / fullTarget) * 100;
    const m1AccelLocked = rampMonth === "M1" && actualFullTargetAchievement < 100;

    if (m1AccelLocked) {
      // Cap at 100% variable, no accelerator bonus
      result.zone = "At Target";
      result.multiplier = 1;
      result.multiplierLabel = "Accelerator locked (M1)";
      result.variableEarningsPct = 100;
      result.insightMessage = `M1 Ramp: You've exceeded your reduced target but accelerators don't unlock until you hit the full target of $${fullTarget.toFixed(2)}. You need $${(fullTarget - actualMRR).toFixed(2)} more MRR to unlock accelerators.`;
    } else {
      // Accelerator is always calculated from the FULL target, not the ramp target
      // For M1: full target = 2x entered ramp target; for M2+: fullTarget = effectiveTarget
      const accelBaseTarget = fullTarget;
      const fullAchievement = (actualMRR / accelBaseTarget) * 100;
      const cappedFullAchievement = Math.min(fullAchievement, 175);
      const aboveFullTarget = cappedFullAchievement - 100;

      const accelMultiplier = getAcceleratorMultiplier(dealCount);
      result.multiplier = accelMultiplier;
      result.multiplierLabel = `Accelerator ${accelMultiplier}x`;

      const acceleratorBonus = (aboveFullTarget / 100) * variablePay * accelMultiplier;
      result.baseCommission += acceleratorBonus;
      result.variableEarningsPct = (result.baseCommission / variablePay) * 100;

      // Cap requires BOTH 175%+ full target achievement AND 8+ deals (2x accelerator)
      const isFullCap = fullAchievement >= 175 && dealCount >= 8;
      result.zone = isFullCap ? "Cap" : "Accelerator";

      if (isFullCap) {
        result.insightMessage = `You have hit the 175% cap with 8+ deals (2x accelerator). Maximum variable earnings achieved.`;
      } else if (fullAchievement >= 175 && dealCount < 8) {
        const nextAccel = getAcceleratorMultiplier(dealCount + 1);
        const maxAbove = 175 - 100;
        const currentCommission = result.baseCommission;
        const newCommission = variablePay + (maxAbove / 100) * variablePay * nextAccel;
        const additionalEarnings = newCommission - currentCommission;
        result.insightMessage = `You have reached 175% of full target but your accelerator is ${accelMultiplier}x (${dealCount} deals). One more deal would increase to ${nextAccel}x, earning an additional $${additionalEarnings.toFixed(2)}.`;
      } else {
        if (dealCount >= 8) {
          result.mrrToCap = accelBaseTarget * 1.75 - actualMRR;
          result.insightMessage = `You have maxed the accelerator at ${accelMultiplier}x. You need $${result.mrrToCap.toFixed(2)} more MRR to hit the 175% cap.`;
        } else {
          const avgMRRPerDeal = dealCount > 0 ? actualMRR / dealCount : 0;
          if (avgMRRPerDeal > 0) {
            const newDealCount = dealCount + 1;
            const newActualMRR = actualMRR + avgMRRPerDeal;
            const newFullAchievement = Math.min((newActualMRR / accelBaseTarget) * 100, 175);
            const newAbove = newFullAchievement - 100;
            const newAccel = getAcceleratorMultiplier(newDealCount);
            const newCommission = variablePay + (newAbove / 100) * variablePay * newAccel;
            result.additionalEarningsOneMoreDeal = newCommission - result.baseCommission;
            result.insightMessage = `One more deal at your average MRR of $${avgMRRPerDeal.toFixed(2)} would earn you an additional $${result.additionalEarningsOneMoreDeal.toFixed(2)} (new accelerator: ${newAccel}x).`;
          }
        }
      }
    }
  }

  // Performance bonus (always measured against full target)
  const achievementVsFullTarget = (actualMRR / fullTarget) * 100;
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
export function generateCurveData({ role = "BDM", dealCount = 5, threshold = 70, cap = 175, rampMonth = "M2+" } = {}) {
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
