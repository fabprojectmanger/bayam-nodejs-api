let express = require('express');
let router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/', async function (req, res) {
    const { name, cardNumber, expirationDate, securityCode, amount, currency } = req.body;
    try {
      // Create a Payment Intent using card details
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        description: 'Example Payment',
        payment_method_data: {
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: expirationDate.split('-')[1],
            exp_year: expirationDate.split('-')[2],
            cvc:securityCode,
          },
        },
        confirm: true,
        automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
      });
  
      // Payment successful
      res.json({ success: true, message: 'Payment succeeded' });
    } catch (error) {
      // Handle payment failure
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  
});


module.exports = router;