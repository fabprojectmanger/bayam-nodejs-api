let shopifyService = require('./shopify.service');

async function createOrder(order, user) {
	try {

		let lookupDiscount = await shopifyService.getCall(`/discount_codes/lookup.json?code=${order?.appliedDiscount?.title}`);
		
		let orderId = null;
		if (order.lineItems) {
			let orderData = {
				"draft_order": {
					"email": order?.email,
					"line_items": order?.lineItems,
					"financial_status": "pending",
					"shipping_address": {
						"first_name": order?.shippingAddress?.firstName,
						"last_name": order?.shippingAddress?.lastName,
						"country": order?.shippingAddress?.country,
						"address1": order?.shippingAddress?.streetAddress,
						"city": order?.shippingAddress?.city,
						"province": order?.shippingAddress?.state,
						"zip": order?.shippingAddress?.zip
					},
					...(order?.billingAddress) && {
						"billing_address": {
							"first_name": order?.billingAddress?.firstName,
							"last_name": order?.billingAddress?.lastName,
							"country": order?.billingAddress?.country,
							"address1": order?.billingAddress?.streetAddress,
							"city": order?.billingAddress?.city,
							"province": order?.billingAddress?.state,
							"zip": order?.billingAddress?.zip
						}
					},
					"subtotal_price": order?.subTotalPrice,
					"total_price": order?.totalPrice,
					"total_tax": order?.totalTax
				}
			};

			if(lookupDiscount?.discount_code?.code) {
				orderData.draft_order.applied_discount = {
					"title": order?.appliedDiscount?.title,
					"amount": order?.appliedDiscount?.amount
				}
			}
			let draftOrder = await shopifyService.postCall('draft_orders.json', orderData);
			if (draftOrder?.draft_order) {
				let completeOrder = await shopifyService.putCall('/draft_orders/' + draftOrder.draft_order.id + '/complete.json?payment_pending=true', {});
				orderId = completeOrder?.draft_order?.order_id
			}
		}
		return { orderId };
	} catch (e) {
		throw e;
	}
}

module.exports = {
	createOrder
}