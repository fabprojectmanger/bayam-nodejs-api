const axios = require('axios');
async function makePayment(card_data,transaction_data) {

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;

    const paymentData = {
      intent: 'sale',
      payer: {
        payment_method: 'credit_card',
        funding_instruments: [
          {
            credit_card: card_data,
          },
        ],
      },
      transactions: [
        {
          amount: {
            total: transaction_data?.value.toString(),
            currency: transaction_data?.currency,
          },
        },
      ],
    };

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try{
    const response=await axios
      .post('https://api-m.sandbox.paypal.com/v1/payments/payment', paymentData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth}`,
        },
      })
      return response.data;
    }
    catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
 
}
module.exports = { makePayment }