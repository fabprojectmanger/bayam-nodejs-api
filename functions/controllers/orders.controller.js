let express = require('express');
let router = express.Router();
let OrdersService = require('../services/orders.service');
let ResponseService = require('../utils/res');
const Order=require('../models/order')

router.post('/', async function (req, res) {
	try {
		let data = await OrdersService.createOrder(req.body, req.user);
		let response = ResponseService.response(data, null);
			const order = new Order(req.body); // Create a new card document
			 await order.save();
		res.status(200).send(response);
	} catch (error) {
		console.error('Error processing order checkout: ', error.message);
		res.status(400).send('Error processing order checkout: ', error);
	}
});
router.post('/payment', async function (req, res) {
	try {
		let data = await OrdersService.orderPayment(req.body);
		let response = ResponseService.response(data, null);
		res.status(200).send(response);
	} catch (error) {
		console.error('Error processing payment: ', error.message);
		res.status(400).send('Error processing payment: ', error);
	}
});


module.exports = router;