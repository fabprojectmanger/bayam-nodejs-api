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

router.post('/validate-discount', async function (req, res) {
	try {
		const couponCode = req.body.couponcode;
		let lookupDiscount = await discountService.getDiscountCodes(couponCode);
		let data = await discountService.getOfferDetails(lookupDiscount?.discount_code?.price_rule_id);
		let response = ResponseService.response(data, null);
		res.status(200).send(response);
	} catch (error) {
		console.error('Error processing order checkout: ', error.message);
		res.status(400).send('Error processing order checkout: ', error);
	}
});

module.exports = router;