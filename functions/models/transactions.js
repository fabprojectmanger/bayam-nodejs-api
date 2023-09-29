const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
    customerId: { type: String, required: false },
    paymentMethodId: { type: String, required: false },
    paymentStatus: { type: String, required: true },
    paymentType: { type: String, required: true },
    amount: {
      value: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.model('Transaction', transactionsSchema);

module.exports = Transaction;
