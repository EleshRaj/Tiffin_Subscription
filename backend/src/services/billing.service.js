/**
 * Billing Service — Isolated, pure billing calculation engine.
 *
 * Builder Round Business Rules:
 *   • Service days are strictly Monday to Friday (weekdays).
 *   • Saturday and Sunday are NOT service days (not delivered, not billed).
 *   • A customer is billed only for service weekdays actually served.
 *   • Total Service Days = Total Weekdays in the month/cycle.
 *   • Served Days = Total Service Days - Paused Service Days.
 *   • Final Bill = round(Monthly Price * Served Days / Total Service Days, 2).
 *   • Transfer Split Billing: Divides served weekdays according to active customer assignments.
 */

const {
  isWeekday,
  getTotalDaysInMonth,
  getWeekdaysInMonth,
  getAllWeekdaysInMonth,
  isDateInInterval
} = require('./calendar.service');

/**
 * Count weekdays (Mon-Fri) between two Date objects (inclusive).
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {number}
 */
function countWeekdaysBetween(start, end) {
  const dStart = typeof start === 'string' ? new Date(start + 'T00:00:00') : new Date(start);
  dStart.setHours(0, 0, 0, 0);
  const dEnd = typeof end === 'string' ? new Date(end + 'T00:00:00') : new Date(end);
  dEnd.setHours(0, 0, 0, 0);

  if (dEnd < dStart) return 0;

  let count = 0;
  const current = new Date(dStart);
  while (current <= dEnd) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Calculate paused weekdays for a given month from a list of pause periods.
 * Pauses that span month boundaries are clipped to the target month.
 *
 * @param {Array<{start_date: string, end_date: string}>} pausePeriods
 * @param {number} year
 * @param {number} month - 1-indexed (1=Jan, 9=Sep)
 * @returns {Set<string>} - Set of YYYY-MM-DD paused weekday strings
 */
function getPausedWeekdaysSet(pausePeriods, year, month) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const totalDays = getTotalDaysInMonth(year, month);
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

  const pausedWeekdays = new Set();

  for (const pause of pausePeriods || []) {
    const effectiveStart = pause.start_date < monthStart ? monthStart : pause.start_date;
    const effectiveEnd = pause.end_date > monthEnd ? monthEnd : pause.end_date;

    if (effectiveStart > effectiveEnd) continue;

    const current = new Date(effectiveStart + 'T00:00:00');
    const end = new Date(effectiveEnd + 'T00:00:00');

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        pausedWeekdays.add(`${y}-${m}-${d}`);
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return pausedWeekdays;
}

/**
 * Generate a full billing breakdown for a subscription in a given month (Monday-to-Friday service).
 *
 * @param {number} monthlyPrice - e.g. 3000
 * @param {Array<{start_date: string, end_date: string}>} pausePeriods
 * @param {string} monthStr - "YYYY-MM" format (e.g. "2026-09")
 * @returns {object}
 */
function calculateBill(monthlyPrice, pausePeriods, monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const allWeekdays = getAllWeekdaysInMonth(year, month);
  const totalServiceDays = allWeekdays.length; // weekdays in month

  const pausedSet = getPausedWeekdaysSet(pausePeriods, year, month);
  const pausedDays = pausedSet.size;
  const daysServed = Math.max(0, totalServiceDays - pausedDays);

  const dailyRate = totalServiceDays > 0
    ? Math.round((monthlyPrice / totalServiceDays) * 100) / 100
    : 0;

  const finalAmount = totalServiceDays > 0
    ? Math.round((monthlyPrice * daysServed / totalServiceDays) * 100) / 100
    : 0;

  return {
    month: monthStr,
    serviceDaysPerWeek: 5,
    monthlyPlan: monthlyPrice,
    monthlyPrice: monthlyPrice,
    totalDays: totalServiceDays,
    totalWeekdays: totalServiceDays,
    totalWeekdaysInMonth: totalServiceDays,
    pausedDays: pausedDays,
    pausedWeekdays: pausedDays,
    servedDays: daysServed,
    servedWeekdays: daysServed,
    daysServed: daysServed,
    dailyRate: dailyRate,
    perDayRate: dailyRate,
    finalAmount: finalAmount,
    totalAmount: finalAmount,
    isSplit: false
  };
}

/**
 * Generate a split billing breakdown when a subscription has been transferred mid-cycle.
 *
 * @param {number} monthlyPrice
 * @param {Array<{start_date: string, end_date: string}>} pausePeriods
 * @param {Array<{customer_id: number, customer_name?: string, start_date: string, end_date: string|null}>} assignments
 * @param {string} monthStr - "YYYY-MM"
 * @returns {object}
 */
function calculateSplitBill(monthlyPrice, pausePeriods, assignments, monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const allWeekdays = getAllWeekdaysInMonth(year, month);
  const totalServiceDays = allWeekdays.length;
  const pausedSet = getPausedWeekdaysSet(pausePeriods, year, month);

  // Map customer assignments
  const customerDays = new Map(); // customer_id -> { id, name, servedDays: 0 }

  for (const assign of assignments || []) {
    if (!customerDays.has(assign.customer_id)) {
      customerDays.set(assign.customer_id, {
        customerId: assign.customer_id,
        customerName: assign.customer_name || `Customer #${assign.customer_id}`,
        servedDays: 0,
        amount: 0
      });
    }
  }

  let totalServed = 0;

  // Allocate each served weekday to the assigned customer
  for (const dateStr of allWeekdays) {
    if (pausedSet.has(dateStr)) {
      continue; // paused day, no customer served
    }

    // Find assignment for this date
    const matched = assignments.find(a => isDateInInterval(dateStr, a.start_date, a.end_date));
    if (matched) {
      const entry = customerDays.get(matched.customer_id);
      if (entry) {
        entry.servedDays += 1;
        totalServed += 1;
      }
    }
  }

  // Calculate bill for each customer
  const splits = [];
  let totalBilled = 0;

  for (const entry of customerDays.values()) {
    const amount = totalServiceDays > 0
      ? Math.round((monthlyPrice * entry.servedDays / totalServiceDays) * 100) / 100
      : 0;
    entry.amount = amount;
    totalBilled += amount;
    splits.push(entry);
  }

  const dailyRate = totalServiceDays > 0
    ? Math.round((monthlyPrice / totalServiceDays) * 100) / 100
    : 0;

  return {
    month: monthStr,
    serviceDaysPerWeek: 5,
    monthlyPlan: monthlyPrice,
    monthlyPrice: monthlyPrice,
    totalDays: totalServiceDays,
    totalWeekdays: totalServiceDays,
    totalWeekdaysInMonth: totalServiceDays,
    pausedDays: pausedSet.size,
    pausedWeekdays: pausedSet.size,
    servedDays: totalServed,
    servedWeekdays: totalServed,
    daysServed: totalServed,
    dailyRate: dailyRate,
    perDayRate: dailyRate,
    finalAmount: Math.round(totalBilled * 100) / 100,
    totalAmount: Math.round(totalBilled * 100) / 100,
    isSplit: splits.length > 1,
    splits: splits
  };
}

module.exports = {
  countWeekdaysBetween,
  getTotalDaysInMonth,
  getTotalWeekdaysInMonth: getWeekdaysInMonth,
  getPausedWeekdays: (pauses, y, m) => getPausedWeekdaysSet(pauses, y, m).size,
  calculateBill,
  calculateSplitBill
};
