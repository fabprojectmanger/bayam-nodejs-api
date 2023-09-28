let express = require('express');
let router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/', async function (req, res) {
  const { paymentMethodId } = req.body;

  try {
    // Create a payment intent with the token
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3, // The amount in cents (e.g., $10.00)
      currency: 'USD',
      description: 'Example Payment',
      payment_method_types: ['card'],
      payment_method: paymentMethodId,
      confirm: true,
      shipping: {
        name: 'John Doe', // Customer's name
        address: {
          line1: '123 Main Street',
          city: 'City',
          state: 'State',
          postal_code: '12345',
          country: 'IN', // India
        }
      }
    });


    // If the payment was successful, you can send a success response
    res.json({ success: true, paymentIntent });
  }catch(error){
    throw error;
  }
});

// router.post('/', async function (req, res) {
//   console.log("Request Body------------>",req.body);
//     const { name, cardNumber, expirationDate, securityCode, amount, currency } = req.body;
//     try {
//       // Create a Payment Intent using card details
//       const paymentIntent = await stripe.paymentIntents.create({
//         amount,
//         currency,
//         description: 'Example Payment',
//         payment_method_data: {
//           type: 'card',
//           card: {
//             number: cardNumber,
//             exp_month: expirationDate.split('/')[0],
//             exp_year: expirationDate.split('/')[1],
//             cvc:securityCode,
//           },
//         },
//         confirm: true,
//         automatic_payment_methods: {
//             enabled: true,
//             allow_redirects: 'never',
//           },
//       });
  
//       // Payment successful
//       res.json({ success: true, message: 'Payment succeeded' });
//     } catch (error) {
//       // Handle payment failure
//       console.error(error);
//       res.status(500).json({ success: false, error: error.message });
//     }
  
// });


module.exports = router;