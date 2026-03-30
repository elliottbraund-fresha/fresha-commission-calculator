const TL_PERSONAL_SCALE = [
  { min: 0, max: 0, pct: 1.5, label: "0 BDMs" },
  { min: 1, max: 3, pct: 0.8, label: "1–3 BDMs" },
  { min: 4, max: 6, pct: 0.33, label: "4–6 BDMs" },
  { min: 7, max: 999, pct: 0.0, label: "7+ BDMs" },
];

export function getTLPersonalPct(count) {
  const bracket = TL_PERSONAL_SCALE.find(b => count >= b.min && count <= b.max);
  return bracket ? bracket.pct : 0;
}

export function calcTLCommission({
  rampMonth, baseBDMTarget, bdmCount, bdmTargets, bdmActuals,
  tlPersonalMRR, tlOneTimeRevenue, exchangeRate,
}) {
  const result = {
    personalTarget: 0, totalTarget: 0, totalActual: 0,
    achievementPct: 0, zone: "Threshold", commission: 0,
    performanceBonus: 0, totalUSD: 0, totalLocal: 0,
    rampMessage: null, bdmBreakdown: [],
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
    sumBDMTargets += t;
    sumBDMActuals += a;
    result.bdmBreakdown.push({
      index: i + 1,
      target: t,
      actual: a,
      achievement: t > 0 ? (a / t) * 100 : 0,
    });
  }

  result.totalTarget = result.personalTarget + sumBDMTargets;
  result.totalActual = tlPersonalMRR + sumBDMActuals;

  if (result.totalTarget <= 0) return result;

  const achievement = (result.totalActual / result.totalTarget) * 100;
  result.achievementPct = achievement;

  const targetCommission = result.totalTarget;

  // TL: threshold 80%, cap 125%, decel 2x, accel 2x
  if (achievement < 80) {
    result.zone = "Threshold";
    result.commission = 0;
  } else if (achievement <= 100) {
    result.zone = "Decelerator";
    const progressInZone = (achievement - 80) / 20;
    const deceleratedProgress = Math.pow(progressInZone, 2);
    result.commission = targetCommission * deceleratedProgress;
  } else {
    result.commission = targetCommission;
    const cappedAchievement = Math.min(achievement, 125);
    const aboveTarget = cappedAchievement - 100;
    const acceleratorBonus = (aboveTarget / 100) * targetCommission * 2;
    result.commission += acceleratorBonus;

    result.zone = achievement >= 125 ? "Cap" : "Accelerator";
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
