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
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;


// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
//   amount: { type: Number, required: true },
//   orderItems: [{ type: String }], // Define a more detailed schema for order items if needed
//   createdAt: { type: Date, default: Date.now },
//   // Add other fields as needed
// });

// const Order = mongoose.model('Order', orderSchema);

// module.exports = Order;
