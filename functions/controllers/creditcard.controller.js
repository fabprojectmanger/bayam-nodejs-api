let express = require('express');
let router = express.Router();
let ResponseService = require('../utils/res');
let CreditCardsService = require('../services/creditCards.service');

router.get('/', function (req, res) {
  CreditCardsService.getCustomerCreditCards(req.user.shopifyId).
    then(function (data) {
      let response = ResponseService.response(data, null);
      res.status(200).send(response);
    }).
    catch(function (err) {
      console.error('Error getting user credit cards: ', err);
      let response = ResponseService.response(null, 'Error getting user credit cards.');
      res.status(400).send(response);
    });
});

module.exports = router;
