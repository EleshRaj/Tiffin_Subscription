/**
 * Import Service — Messy CSV customer ingestion, normalization, and deduplication.
 *
 * Requirements:
 *   • Handles messy CSV input with duplicate phone numbers, mixed date formats, blank/invalid fields.
 *   • Supports date formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY.
 *   • Normalizes 10-digit phone numbers.
 *   • Deduplication: Keeps the first valid record for a normalized phone number;
 *     subsequent duplicates are classified as 'deduped'.
 *   • Rejection: Blank name, invalid phone, non-positive price, or bad dates are 'rejected'.
 *   • Returns { imported: X, deduped: Y, rejected: Z, errors: [ { row, reason } ] }.
 */

const db = require('../config/db');

/**
 * Normalize phone number to clean 10-digit string.
 * @param {string} phone
 * @returns {string|null}
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Strip spaces, hyphens, brackets, dots, plus signs
  let cleaned = phone.trim().replace(/[\s\-\(\)\.\+]/g, '');

  // Strip leading international country code +91 or 91 if followed by 10 digits
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  // Strip leading 0 if 11 digits
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must be strictly 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Normalize date string to ISO YYYY-MM-DD.
 * Supports:
 *   - YYYY-MM-DD
 *   - DD/MM/YYYY
 *   - DD-MM-YYYY
 *   - YYYY/MM/DD
 *
 * @param {string} dateStr
 * @returns {string|null}
 */
function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  let year, month, day;

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    // Format 2: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
    }
  }

  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Validate actual calendar day
  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Simple CSV line parser handling quotes.
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Process messy customer CSV text for a given owner.
 *
 * @param {number} ownerId
 * @param {string} csvContent - Raw CSV string
 * @returns {object} - { imported, deduped, rejected, errors }
 */
function importCustomersCsv(ownerId, csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new Error('CSV file content is empty.');
  }

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV file contains no data rows.');
  }

  // Parse header
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_]/g, ''));
  const nameIdx = header.findIndex(h => h === 'name' || h === 'customername');
  const phoneIdx = header.findIndex(h => h === 'phone' || h === 'phonenumber' || h === 'mobile');
  const priceIdx = header.findIndex(h => h === 'monthlyprice' || h === 'price' || h === 'plan');
  const dateIdx = header.findIndex(h => h === 'startdate' || h === 'date');
  const tiffinIdx = header.findIndex(h => h === 'tiffintype' || h === 'mealtype' || h === 'type');

  if (nameIdx === -1 || phoneIdx === -1) {
    throw new Error('CSV must contain at least "name" and "phone" columns.');
  }

  // Pre-load existing phone numbers for this owner to detect DB-level duplicates
  const existingRows = db.prepare('SELECT phone FROM customers WHERE owner_id = ?').all(ownerId);
  const existingPhones = new Set(existingRows.map(r => r.phone));

  const seenInBatch = new Set();
  const validRecords = [];
  const errors = [];
  let deduped = 0;
  let rejected = 0;

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed including header
    const cols = parseCsvLine(lines[i]);

    // Skip trailing blank row
    if (cols.length === 1 && cols[0] === '') continue;

    const rawName = cols[nameIdx];
    const rawPhone = cols[phoneIdx];
    const rawPrice = priceIdx !== -1 ? cols[priceIdx] : '2500';
    const rawDate = dateIdx !== -1 ? cols[dateIdx] : '2026-09-01';
    const rawTiffin = tiffinIdx !== -1 ? cols[tiffinIdx] : 'Standard Veg Thali';

    // 1. Validate Name
    if (!rawName || rawName.trim().length === 0) {
      rejected++;
      errors.push({ row: rowNum, reason: 'Missing or empty customer name' });
      continue;
    }
    const name = rawName.trim();

    // 2. Validate & Normalize Phone
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      rejected++;
      errors.push({ row: rowNum, reason: `Invalid 10-digit phone number: "${rawPhone || ''}"` });
      continue;
    }

    // 3. Validate Monthly Price
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price <= 0) {
      rejected++;
      errors.push({ row: rowNum, reason: `Invalid monthly plan price: "${rawPrice || ''}"` });
      continue;
    }

    // 4. Validate & Normalize Date
    const startDate = normalizeDate(rawDate);
    if (!startDate) {
      rejected++;
      errors.push({ row: rowNum, reason: `Invalid date format: "${rawDate || ''}"` });
      continue;
    }

    // 5. Deduplication Check
    if (seenInBatch.has(phone)) {
      deduped++;
      continue; // Duplicate within batch, discard
    }

    if (existingPhones.has(phone)) {
      deduped++;
      continue; // Duplicate of already registered customer
    }

    // Record is clean and unique!
    seenInBatch.add(phone);
    validRecords.push({
      name,
      phone,
      monthlyPrice: price,
      startDate,
      tiffinType: rawTiffin && rawTiffin.trim() ? rawTiffin.trim() : 'Standard Veg Thali'
    });
  }

  // Insert valid records in a single database transaction
  const insertBatch = db.transaction(() => {
    const insertCust = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)');
    const insertSub = db.prepare('INSERT INTO subscriptions (customer_id, monthly_price, start_date, status, tiffin_type) VALUES (?, ?, ?, ?, ?)');
    const insertAssign = db.prepare('INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, ?, NULL)');

    for (const rec of validRecords) {
      const cRes = insertCust.run(ownerId, rec.name, rec.phone);
      const customerId = cRes.lastInsertRowid;
      const sRes = insertSub.run(customerId, rec.monthlyPrice, rec.startDate, 'ACTIVE', rec.tiffinType);
      const subscriptionId = sRes.lastInsertRowid;
      insertAssign.run(subscriptionId, customerId, rec.startDate);
    }
  });

  if (validRecords.length > 0) {
    insertBatch();
  }

  return {
    imported: validRecords.length,
    deduped,
    rejected,
    errors
  };
}

module.exports = {
  normalizePhone,
  normalizeDate,
  parseCsvLine,
  importCustomersCsv
};
