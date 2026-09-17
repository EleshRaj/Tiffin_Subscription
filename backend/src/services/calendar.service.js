/**
 * Calendar Service — Centralized date math and weekday logic.
 *
 * Core Business Rule:
 * Service days are Monday through Friday (1 to 5).
 * Saturday (6) and Sunday (0) are non-service days.
 */

/**
 * Check if a date string (YYYY-MM-DD) or Date object is a Monday-to-Friday weekday.
 * @param {string|Date} dateInput
 * @returns {boolean}
 */
function isWeekday(dateInput) {
  let d;
  if (typeof dateInput === 'string') {
    d = new Date(dateInput + 'T00:00:00');
  } else {
    d = new Date(dateInput);
  }
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Format Date object to YYYY-MM-DD string.
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get total number of days in a month (1-indexed month, e.g. 9 for September).
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getTotalDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Get total number of weekdays (Mon-Fri) in a month.
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getWeekdaysInMonth(year, month) {
  const totalDays = getTotalDaysInMonth(year, month);
  let weekdays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays++;
    }
  }
  return weekdays;
}

/**
 * Get array of all YYYY-MM-DD weekday strings in a month.
 * @param {number} year
 * @param {number} month
 * @returns {string[]}
 */
function getAllWeekdaysInMonth(year, month) {
  const totalDays = getTotalDaysInMonth(year, month);
  const weekdays = [];
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays.push(formatDate(d));
    }
  }
  return weekdays;
}

/**
 * Check if a date string is inside an interval [startDate, endDate] (inclusive).
 * If endDate is null/empty, checks if dateStr >= startDate.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} startStr - YYYY-MM-DD
 * @param {string|null} endStr - YYYY-MM-DD
 * @returns {boolean}
 */
function isDateInInterval(dateStr, startStr, endStr) {
  if (dateStr < startStr) return false;
  if (endStr && dateStr > endStr) return false;
  return true;
}

module.exports = {
  isWeekday,
  formatDate,
  getTotalDaysInMonth,
  getWeekdaysInMonth,
  getAllWeekdaysInMonth,
  isDateInInterval
};
