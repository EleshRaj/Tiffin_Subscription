const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// T6: Transfer subscription mid-cycle
router.post('/:id/transfer', subscriptionController.transfer);

module.exports = router;
