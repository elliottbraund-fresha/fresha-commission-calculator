import { calcBDMCommission, getAcceleratorMultiplier } from './commissionCalc.js';

/**
 * Retention Adjustment Calculator.
 *
 * This recalculates commission from scratch using the NEW (retained) MRR value
 * but keeping the SAME deal count (no change in accelerator from deal count).
 *
 * If retained MRR >= original MRR: no adjustment (no positive adjustment).
 * If retained MRR < original MRR: recalculate commission, clawback = original - recalculated.
 * If threshold is missed after adjustment: full original commission is clawed back.
 */
export function calcRetention({
  originalMRR, retainedMRR, variablePay, dealCount,
  monthlyTarget, rampMonth, role, oneTimeRevenue,
  currentMonthCommission, exchangeRate,
}) {
  const result = {
    retentionPct: 0, shortfallPct: 0,
    originalCommission: 0, recalculatedCommission: 0,
    clawbackAmount: 0, netCommission: 0, carryForward: 0,
    status: "green",
    thresholdMissed: false,
    originalResult: null,
    recalculatedResult: null,
  };

  if (originalMRR <= 0) return result;

  result.retentionPct = (retainedMRR / originalMRR) * 100;

  // No positive adjustment - if retained >= original, net impact = 0
  if (retainedMRR >= originalMRR) {
    // Calculate original commission for display
    const origCalc = calcBDMCommission({
      role: role || "BDM", rampMonth: rampMonth || "M2+",
      monthlyTarget, actualMRR: originalMRR,
      dealCount, oneTimeRevenue: oneTimeRevenue || 0,
      variablePay, currencyCode: "USD", exchangeRate: 1,
    });
    result.originalCommission = origCalc.baseCommission;
    result.recalculatedCommission = origCalc.baseCommission;
    result.netCommission = currentMonthCommission;
    result.status = "green";
    result.originalResult = origCalc;
    result.recalculatedResult = origCalc;
    return result;
  }

  // Calculate original commission
  const origCalc = calcBDMCommission({
    role: role || "BDM", rampMonth: rampMonth || "M2+",
    monthlyTarget, actualMRR: originalMRR,
    dealCount, oneTimeRevenue: oneTimeRevenue || 0,
    variablePay, currencyCode: "USD", exchangeRate: 1,
  });
  result.originalCommission = origCalc.baseCommission;
  result.originalResult = origCalc;

  // Recalculate commission with retained MRR (same deal count)
  const newCalc = calcBDMCommission({
    role: role || "BDM", rampMonth: rampMonth || "M2+",
    monthlyTarget, actualMRR: retainedMRR,
    dealCount, oneTimeRevenue: oneTimeRevenue || 0,
    variablePay, currencyCode: "USD", exchangeRate: 1,
  });
  result.recalculatedCommission = newCalc.baseCommission;
  result.recalculatedResult = newCalc;

  result.shortfallPct = 100 - result.retentionPct;

  // If threshold is missed after adjustment, full clawback
  if (newCalc.zone === "Threshold") {
    result.thresholdMissed = true;
    result.clawbackAmount = result.originalCommission;
    result.recalculatedCommission = 0;
  } else {
    result.clawbackAmount = result.originalCommission - result.recalculatedCommission;
  }

  // Ensure clawback is never negative (shouldn't happen given retainedMRR < originalMRR)
  result.clawbackAmount = Math.max(0, result.clawbackAmount);

  result.netCommission = currentMonthCommission - result.clawbackAmount;

  if (result.netCommission < 0) {
    result.carryForward = Math.abs(result.netCommission);
    result.netCommission = 0;
  }

  result.status = result.thresholdMissed ? "red" :
                  result.retentionPct >= 80 ? "amber" : "red";
  return result;
}
import { calcBDMCommission } from './commissionCalc.js';

export function calcRetention({
  originalMRR, retainedMRR, variablePay, dealCount,
  monthlyTarget, rampMonth, role, oneTimeRevenue,
  currentMonthCommission, exchangeRate,
}) {
  const result = {
    retentionPct: 0, shortfallPct: 0,
    originalCommission: 0, recalculatedCommission: 0,
    clawbackAmount: 0, netCommission: 0, carryForward: 0,
    status: "green",
    thresholdMissed: false,
    originalResult: null,
    recalculatedResult: null,
  };

  if (originalMRR <= 0) return result;

  result.retentionPct = (retainedMRR / originalMRR) * 100;

  if (retainedMRR >= originalMRR) {
    const origCalc = calcBDMCommission({
      role: role || "BDM", rampMonth: rampMonth || "M2+",
      monthlyTarget, actualMRR: originalMRR,
      dealCount, oneTimeRevenue: oneTimeRevenue || 0,
      variablePay, currencyCode: "USD", exchangeRate: 1,
    });
    result.originalCommission = origCalc.baseCommission;
    result.recalculatedCommission = origCalc.baseCommission;
    result.netCommission = currentMonthCommission;
    result.status = "green";
    result.originalResult = origCalc;
    result.recalculatedResult = origCalc;
    return result;
  }

  const origCalc = calcBDMCommission({
    role: role || "BDM", rampMonth: rampMonth || "M2+",
    monthlyTarget, actualMRR: originalMRR,
    dealCount, oneTimeRevenue: oneTimeRevenue || 0,
    variablePay, currencyCode: "USD", exchangeRate: 1,
  });
  result.originalCommission = origCalc.baseCommission;
  result.originalResult = origCalc;

  const newCalc = calcBDMCommission({
    role: role || "BDM", rampMonth: rampMonth || "M2+",
    monthlyTarget, actualMRR: retainedMRR,
    dealCount, oneTimeRevenue: oneTimeRevenue || 0,
    variablePay, currencyCode: "USD", exchangeRate: 1,
  });
  result.recalculatedCommission = newCalc.baseCommission;
  result.recalculatedResult = newCalc;

  result.shortfallPct = 100 - result.retentionPct;

  if (newCalc.zone === "Threshold") {
    result.thresholdMissed = true;
    result.clawbackAmount = result.originalCommission;
    result.recalculatedCommission = 0;
  } else {
    result.clawbackAmount = result.originalCommission - result.recalculatedCommission;
  }

  result.clawbackAmount = Math.max(0, result.clawbackAmount);

  result.netCommission = currentMonthCommission - result.clawbackAmount;

  if (result.netCommission < 0) {
    result.carryForward = Math.abs(result.netCommission);
    result.netCommission = 0;
  }

  result.status = result.thresholdMissed ? "red" :
                  result.retentionPct >= 80 ? "amber" : "red";
  return result;
}
