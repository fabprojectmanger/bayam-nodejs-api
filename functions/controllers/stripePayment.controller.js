let puppeteer = require('puppeteer');
const chromium = require("@sparticuz/chromium");
let express = require('express');
const Transaction = require('../models/transactions');
let router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;
router.post('/', async function (req, res) {
  const { paymentMethodId, customerName, line1, city, state, postalCode, country, amount } = req.body;
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
      amount: amount,
      currency: 'USD',
      description: 'Example Payment',
      payment_method_types: ['card'],
      payment_method: paymentMethodId,
      confirm: true,
      customer: customer.id
    });
    if (paymentIntent && paymentIntent.next_action) {
      let url = paymentIntent.next_action.use_stripe_sdk.stripe_js;
      const browser = await puppeteer.launch({
        args:chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: process.env.CHROME_EXECUTABLE_PATH || await
          chromium.executablePath(),
        headless: chromium.headless,
      });
      const page = await browser.newPage();
      await page.goto(url);
      await browser.close();
      if (paymentIntent && paymentIntent.id) {
        let transactionDetails = {
          customerId: customer.id,
          paymentMethodId: paymentMethodId,
          paymentStatus: "Success",
          paymentType: "Stripe",
          amount: {
            value: amount / 100,
            currency: 'USD'
          }
        }
        const transaction = new Transaction(transactionDetails);
        await transaction.save();
      }

    }
    res.json({ success: true, paymentIntent });
  } catch (error) {
    throw error;
  }
});

module.exports = router;