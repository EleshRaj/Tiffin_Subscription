const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/import.controller');
const authMiddleware = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

router.use(authMiddleware);

// POST /api/customers/import
router.post(
  '/',
  upload.single('file'),
  express.text({ type: ['text/csv', 'text/plain'] }),
  importController.importCsv
);

module.exports = router;
