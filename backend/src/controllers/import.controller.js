const { importCustomersCsv } = require('../services/import.service');

/**
 * POST /api/customers/import
 * Ingest messy CSV file with customer data.
 * Supports multipart file upload (req.file) or raw text body (req.body.csv or req.body).
 */
exports.importCsv = (req, res) => {
  try {
    const ownerId = req.user.id;
    let csvContent = '';

    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (typeof req.body === 'string') {
      csvContent = req.body;
    } else if (req.body && req.body.csv) {
      csvContent = req.body.csv;
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return res.status(400).json({ message: 'No CSV data provided. Please upload a CSV file or submit CSV text.' });
    }

    const report = importCustomersCsv(ownerId, csvContent);
    res.status(200).json(report);
  } catch (err) {
    console.error('Import controller error:', err);
    res.status(400).json({ message: err.message || 'Failed to import CSV data.' });
  }
};
