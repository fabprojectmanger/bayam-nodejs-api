let shopifyService = require('./shopify.service');
async function getDiscountCodes(data) {
    try {
		let lookupDiscount = await shopifyService.getCall(`/discount_codes/lookup.json?code=${data}`);
        if(lookupDiscount){
            return lookupDiscount;
        }
        return {};
    }catch (e) {
		throw e;
	}
}
async function getOfferDetails(data) {
	try {
		let filterPrice = await shopifyService.getCall(`/price_rules/${data}.json`);
		if(filterPrice){
		return filterPrice;
		}
		return {};
	} catch (e) {
		throw e;
	}
}
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
				updatedAt: filterPrice.updated_at,
				prerequisite_subtotal_range: filterPrice.prerequisite_subtotal_range,
				entitled_product_ids: filterPrice.entitled_product_ids,
				target_selection: filterPrice.target_selection,
				id: filterPrice.id,
				entitled_collection_ids: filterPrice.entitled_collection_ids,
				entitled_variant_ids: filterPrice.entitled_variant_ids
			};
		} else {
			return {};
		}
	} catch (e) {
		throw e;
	}
}

module.exports = {
	getDiscountCouponDetails,
	getDiscountCodes,
	getOfferDetails
}