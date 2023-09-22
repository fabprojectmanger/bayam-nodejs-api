const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    number: { type: String, required: true },
    type: { type: String, required: true },
    expire_month: { type: Number, required: true },
    expire_year: { type: Number, required: true },
    cvv2: { type: String, required: true },
    first_name: { type: String },
    last_name: { type: String },
    amount: {
        value: { type: Number, required: true },
        currency: { type: String, required: true },
      },
    
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
