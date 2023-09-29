const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  variant_id: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  country: String,
  streetAddress: String,
  city: String,
  state: String,
  zip: String,
});

const orderSchema = new mongoose.Schema({
  lineItems: {
    type: [lineItemSchema],
    required: true,
  },
  appliedDiscount: {
    title: String,
    amount: String,
  },
  totalTax: String,
  subTotalPrice: String,
  totalPrice: String,
  email: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
