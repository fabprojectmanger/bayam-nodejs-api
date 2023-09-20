let shopifyService = require('./shopify.service');

async function getDiscountCouponDetails({ code }, user) {
	try {

		let allPriceRules = await shopifyService.getCall('price_rules.json?status=active&limit=250');
		let filterPrice = allPriceRules.price_rules.filter(ele => ele.title === code)[0];
		if (filterPrice) {
			return {
				value: filterPrice.value,
				valueType: filterPrice.value_type,
				title: filterPrice.title,
				productIds: filterPrice.prerequisite_product_ids,
				variantIds: filterPrice.prerequisite_variant_ids,
				subTotalRange: filterPrice?.prerequisite_subtotal_range?.greater_than_or_equal_to,
				allocationLimit: filterPrice.allocation_limit,
				oncePerCustomer: filterPrice.once_per_customer,
				usageLimit: filterPrice.usage_limit,
				startAt: filterPrice.starts_at,
				endsAt: filterPrice.ends_at,
				createdAt: filterPrice.created_at,
				updatedAt: filterPrice.updated_at
			};
		} else {
			return {};
		}
	} catch (e) {
		throw e;
	}
}

module.exports = {
	getDiscountCouponDetails
}