const express = require('express');
const router = express.Router();
const clockController = require('../controllers/clock.controller');

// Deterministic Clock simulation
router.post('/clock', clockController.simulateClock);
router.get('/clock', clockController.getClock);

// Outbox inspection endpoint
router.get('/outbox', clockController.getOutbox);

module.exports = router;
