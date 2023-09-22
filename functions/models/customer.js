// models/customer.js

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  // Add other fields as needed
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
