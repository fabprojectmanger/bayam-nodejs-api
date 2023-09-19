let express = require('express');
let router = express.Router();
let discountService = require('../services/discount.service');
let ResponseService = require('../utils/res');

router.get('/', async function (req, res) {
	try {
		let data = await discountService.getDiscountCouponDetails(req.query, req.user);
		let response = ResponseService.response(data, null);
		res.status(200).send(response);
	} catch (error) {
		console.error('Error processing order checkout: ', error.message);
		res.status(400).send('Error processing order checkout: ', error);
	}
});

module.exports = router;