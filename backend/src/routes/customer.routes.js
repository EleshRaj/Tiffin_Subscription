const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth');

// All customer routes are protected
router.use(authMiddleware);

// Customer CRUD
router.post('/', customerController.create);
router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

// Subscription management on a customer
router.post('/:id/subscribe', subscriptionController.subscribe);
router.post('/:id/pause', subscriptionController.pause);
router.post('/:id/resume', subscriptionController.resume);
router.get('/:id/bill', subscriptionController.getBill);

module.exports = router;
