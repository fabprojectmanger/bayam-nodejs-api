let puppeteer = require('puppeteer');
let express = require('express');
let router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/', async function (req, res) {
  const { paymentMethodId, customerName, line1, city, state, postalCode, country } = req.body;
  try {
    const customer = await stripe.customers.create({
      name: customerName,
      address: {
        line1: line1,
        city: city,
        state: state,
        postal_code: postalCode,
        country: country,
      }
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3,
      currency: 'USD',
      description: 'Example Payment',
      payment_method_types: ['card'],
      payment_method: paymentMethodId,
      confirm: true,
      customer:customer.id
    });
    if (paymentIntent && paymentIntent.next_action) {
      let url = paymentIntent.next_action.use_stripe_sdk.stripe_js;
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      await browser.close();

    }
    res.json({ success: true, paymentIntent });
  } catch (error) {
    throw error;
  }
});

module.exports = router;