const TL_PERSONAL_SCALE = [
  { min: 0, max: 0, pct: 1.5, label: "0 BDMs" },
  { min: 1, max: 3, pct: 0.8, label: "1-3 BDMs" },
  { min: 4, max: 6, pct: 0.33, label: "4-6 BDMs" },
  { min: 7, max: 999, pct: 0.0, label: "7+ BDMs" },
];

export function getTLPersonalPct(count) {
  const bracket = TL_PERSONAL_SCALE.find(b => count >= b.min && count <= b.max);
  return bracket ? bracket.pct : 0;
}

/**
 * Team Lead Commission Calculator.
 * variablePay = the TL's monthly variable pay amount.
 * Commission is based on variablePay as 100% at-target earnings.
 * TL: threshold 80%, cap 125%, decel 2x, accel 2x.
 */
export function calcTLCommission({
  rampMonth, baseBDMTarget, bdmCount, bdmTargets, bdmActuals,
  bdmNames, tlPersonalMRR, tlOneTimeRevenue, variablePay, exchangeRate,
}) {
  const result = {
    personalTarget: 0, totalTarget: 0, totalActual: 0,
    achievementPct: 0, zone: "Threshold", commission: 0,
    multiplier: 0, multiplierLabel: "N/A",
    performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    rampMessage: null, bdmBreakdown: [],
    thresholdMissed: false, capHit: false,
    variablePay: variablePay || 0,
  };

  if (rampMonth === "M0") {
    result.rampMessage = "No commission earned during M0 (training month).";
    result.zone = "No Commission";
    return result;
  }

  const personalPct = getTLPersonalPct(bdmCount);
  result.personalTarget = baseBDMTarget * personalPct;

  let sumBDMTargets = 0;
  let sumBDMActuals = 0;

  for (let i = 0; i < bdmCount; i++) {
    const t = bdmTargets[i] || baseBDMTarget;
    const a = bdmActuals[i] || 0;
    const name = (bdmNames && bdmNames[i]) ? bdmNames[i] : `BDM #${i + 1}`;
    sumBDMTargets += t;
    sumBDMActuals += a;
    result.bdmBreakdown.push({
      index: i + 1,
      name,
      target: t,
      actual: a,
      achievement: t > 0 ? (a / t) * 100 : 0,
    });
  }

  // Add Team Lead as the first row in breakdown
  result.bdmBreakdown.unshift({
    index: 0,
    name: "Team Lead",
    target: result.personalTarget,
    actual: tlPersonalMRR,
    achievement: result.personalTarget > 0 ? (tlPersonalMRR / result.personalTarget) * 100 : 0,
    isTeamLead: true,
  });

  result.totalTarget = result.personalTarget + sumBDMTargets;
  result.totalActual = tlPersonalMRR + sumBDMActuals;

  if (result.totalTarget <= 0 || !variablePay) return result;

  const achievement = (result.totalActual / result.totalTarget) * 100;
  result.achievementPct = achievement;

  // TL: threshold 80%, cap 125%, decel 2x, accel 2x
  if (achievement < 80) {
    result.zone = "Threshold";
    result.commission = 0;
    result.multiplier = 0;
    result.multiplierLabel = "Below Threshold";
    result.thresholdMissed = true;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    // Standard 2x decelerator: linear from 0 at 80% to 100% at 100%
    const payoutPct = (achievement - 80) / 20;
    result.commission = variablePay * payoutPct;
    result.multiplier = 2;
    result.multiplierLabel = "Decelerator 2x";
  } else {
    result.commission = variablePay; // 100% at target
    const cappedAchievement = Math.min(achievement, 125);
    const aboveTarget = cappedAchievement - 100;
    const acceleratorBonus = (aboveTarget / 100) * variablePay * 2;
    result.commission += acceleratorBonus;
    result.multiplier = 2;
    result.multiplierLabel = "Accelerator 2x";

    if (achievement >= 125) {
      result.zone = "Cap";
      result.capHit = true;
    } else {
      result.zone = "Accelerator";
    }
  }

  // Performance bonus on TL's own one-time revenue
  if (tlOneTimeRevenue > 0) {
    if (result.achievementPct >= 100) {
      result.performanceBonus = tlOneTimeRevenue * 0.4;
    } else if (result.achievementPct >= 90) {
      result.performanceBonus = tlOneTimeRevenue * 0.2;
    }
  }

  result.totalUSD = result.commission + result.performanceBonus;
  result.totalLocal = result.totalUSD * exchangeRate;

  return result;
}
