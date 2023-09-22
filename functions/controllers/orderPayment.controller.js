let express = require('express');
let router = express.Router();
let paymentService = require('../services/orderPayment.service');

router.get('/', async function (req, res) {
    try {
        // use the cart information passed from the front-end to calculate the order amount detals
        const { cart } = req.body;
        const { jsonResponse, httpStatusCode } = await paymentService.createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
      } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
      }
});
// router.get('/:orderID/capture',async function (req,res){
//     try {
//         const { orderID } = req.params;
//         const { jsonResponse, httpStatusCode } = await paymentService.captureOrder(orderID);
//         res.status(httpStatusCode).json(jsonResponse);
//       } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to capture order." });
//       }
// })

module.exports = router;
