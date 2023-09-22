let express = require('express');
let router = express.Router();
const paypal = require('paypal-rest-sdk');
const Card=require('../models/card');
let paymentService = require('../services/creditCards.service');
paypal.configure({
  mode: 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET,
});
router.post('/validate-credit-card', async (req, res) => {
  try {
    const {
      cardNumber,
      cardName,
      securityCode,
      expirationDate,
      amount
    } = req.body;
    const createCreditCard={
      number: cardNumber,
      type: 'visa',
      expire_month: expirationDate.month,
      expire_year: expirationDate.year,
      cvv2: securityCode,
      first_name: cardName.split(' ')[1],
      last_name: cardName.split(' ')[2],
      amount: {
        value: amount.value,
        currency: amount.currency
      }
    }
    paypal.payment.create(createCreditCard, async (error, validationResponse) => {
      if (error) {
        console.log(error.response);
        res.status(400).json({ success: false, error: 'Credit card validation failed.' });
      } else {
        try{
          createCreditCard.amount = {
            value: amount.value,
            currency: amount.currency
          };
          const card = new Card(createCreditCard);
          await card.save();
          let transaction_data={
            value: amount.value,
            currency: amount.currency
          }
          let payment=await paymentService.makePayment(createCreditCard,transaction_data);
          if(payment){
            res.status(200).json({ success: true, response: "Payment Successful" });
          }
          else{
            res.status(500).json({ success: false, error: 'An error occurred while doing the payment' });
          }
          res.status(200).json({ success: true, response: validationResponse });
        }catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: 'An error occurred while saving the credit card details or doinhg the payment' });
        }
       
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: 'An error occurred while validating the credit card.' });
  }
});
module.exports = router;
