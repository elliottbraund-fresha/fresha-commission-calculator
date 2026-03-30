export function calcRetention({
  originalMRR, retainedMRR, originalCommission,
  currentMonthCommission, exchangeRate,
}) {
  const result = {
    retentionPct: 0, shortfallPct: 0, clawbackAmount: 0,
    adjustedCommission: 0, netCommission: 0, carryForward: 0,
    status: "green",
  };

  if (originalMRR <= 0) return result;

  result.retentionPct = (retainedMRR / originalMRR) * 100;

  if (result.retentionPct >= 100) {
    result.adjustedCommission = originalCommission;
    result.netCommission = currentMonthCommission;
    result.status = "green";
    return result;
  }

  result.shortfallPct = 100 - result.retentionPct;
  result.adjustedCommission = originalCommission * (result.retentionPct / 100);
  result.clawbackAmount = originalCommission - result.adjustedCommission;
  result.netCommission = currentMonthCommission - result.clawbackAmount;

  if (result.netCommission < 0) {
    result.carryForward = Math.abs(result.netCommission);
    result.netCommission = 0;
  }

  result.status = result.retentionPct >= 80 ? "amber" : "red";
  return result;
}
