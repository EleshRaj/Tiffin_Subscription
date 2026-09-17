/**
 * Billing Service — Isolated, reusable billing logic.
 *
 * Business Rules:
 *   • Service runs 7 days a week (Monday to Sunday, all calendar days).
 *   • A customer is billed only for days on which tiffin was actually served.
 *   • Pause periods that span a month boundary are clipped to the target month.
 *   • Multiple pause periods are supported; overlapping is prevented at API level.
 *   • Final amount is rounded to 2 decimal places.
 */

/**
 * Count calendar days between two Date objects (inclusive) in 7-day service.
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function countDaysBetween(start, end) {
  const dStart = new Date(start);
  dStart.setHours(0, 0, 0, 0);
  const dEnd = new Date(end);
  dEnd.setHours(0, 0, 0, 0);

  if (dEnd < dStart) return 0;
  const diffTime = dEnd.getTime() - dStart.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get total calendar days in a given month (1-indexed month, e.g. 9 for September).
 * @param {number} year  – e.g. 2026
 * @param {number} month – 1-indexed (1=Jan, 9=Sep)
 * @returns {number}
 */
function getTotalDaysInMonth(year, month) {
  // Day 0 of the next month is the last day of the target month
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate paused days for a given month from a list of pause periods.
 * Each pause period is clipped to the target month boundaries.
 *
 * @param {Array<{start_date: string, end_date: string}>} pausePeriods
 * @param {number} year
 * @param {number} month – 1-indexed
 * @returns {number}
 */
function getPausedDays(pausePeriods, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // Use a Set of unique date strings to guarantee zero double-counting
  const pausedDates = new Set();

  for (const pause of pausePeriods) {
    const pStart = new Date(pause.start_date + 'T00:00:00');
    const pEnd = new Date(pause.end_date + 'T00:00:00');

    // Clip to month boundaries
    const effectiveStart = pStart < monthStart ? monthStart : pStart;
    const effectiveEnd = pEnd > monthEnd ? monthEnd : pEnd;

    if (effectiveStart > effectiveEnd) continue; // no overlap with this month

    const current = new Date(effectiveStart);
    while (current <= effectiveEnd) {
      pausedDates.add(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
  }

  return pausedDates.size;
}

/**
 * Generate a full billing breakdown for a customer's subscription in a given month (7-day service).
 *
 * @param {number} monthlyPrice – e.g. 2200, 3000
 * @param {Array<{start_date: string, end_date: string}>} pausePeriods
 * @param {string} monthStr – "YYYY-MM" format
 * @returns {object}
 */
function calculateBill(monthlyPrice, pausePeriods, monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const totalDays = getTotalDaysInMonth(year, month);
  const pausedDays = getPausedDays(pausePeriods, year, month);
  const daysServed = Math.max(0, totalDays - pausedDays);

  const dailyRate = totalDays > 0
    ? Math.round((monthlyPrice / totalDays) * 100) / 100
    : 0;

  const finalAmount = totalDays > 0
    ? Math.round((monthlyPrice * daysServed / totalDays) * 100) / 100
    : 0;

  return {
    month: monthStr,
    serviceDaysPerWeek: 7,
    monthlyPlan: monthlyPrice,
    monthlyPrice: monthlyPrice,
    totalDays,
    totalWeekdays: totalDays, // backward compatibility
    totalWeekdaysInMonth: totalDays,
    pausedDays,
    pausedWeekdays: pausedDays,
    servedDays: daysServed,
    servedWeekdays: daysServed,
    daysServed: daysServed,
    dailyRate,
    perDayRate: dailyRate,
    finalAmount,
    totalAmount: finalAmount
  };
}

module.exports = {
  countDaysBetween,
  countWeekdaysBetween: countDaysBetween,
  getTotalDaysInMonth,
  getTotalWeekdaysInMonth: getTotalDaysInMonth,
  getPausedDays,
  getPausedWeekdays: getPausedDays,
  calculateBill
};
