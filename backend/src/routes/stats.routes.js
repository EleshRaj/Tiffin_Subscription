const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/dashboard', subscriptionController.dashboardStats);

module.exports = router;
