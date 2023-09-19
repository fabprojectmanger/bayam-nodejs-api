let _ = require('lodash');
let Q = require('q');
let Cards = require('../schemas/creditcards.schema');

let service = {};
service.getCustomerCreditCard = getCustomerCreditCard;
service.updateCardData = updateCardData;
service.createCardData = createCardData;
service.getCustomerCreditCards = getCustomerCreditCards;

function getCustomerCreditCards(shopifyId) {
  let deferred = Q.defer();
  Cards.find({ shopifyId: shopifyId }, '-shopifyId -squareId -cardData.id').then(cards => {
    deferred.resolve(cards);
  }).catch(err => {
    deferred.reject(err.name + ': ' + err.message);
  })
  return deferred.promise;
}

function getCustomerCreditCard(query) {
  let deferred = Q.defer();
  Cards.findOne(query).then(card => {
    deferred.resolve(card);
  }).catch(err => {
    deferred.reject(err.name + ': ' + err.message);
  })
  return deferred.promise;
}

// To be used by application only.
function updateCardData(id, cardUpdates) {
  let deferred = Q.defer();
  try {
    Cards.findOneAndUpdate({ shopifyId: id }, { cardData: cardUpdates.cardData, updated: new Date() }, { new: true, upsert: true })
      .then(cardData => {
        if (cardData.cardData) {
          delete cardData.cardData.id;
          delete cardData.cardData.billing_address;
          delete cardData.cardData.cardholder_name;
        }
        return deferred.resolve(cardData);
      }).catch(err => {
        return deferred.reject(err.name + ': ' + err.message);
      })
  } catch (e) {
    console.error('There was an error inserting new card into DB: ', e);
    return deferred.reject('Server error storing credit card');
  }
  return deferred.promise;
}

function createCardData(data) {
  let deferred = Q.defer();
  let card = new Cards(data);
  card.save().then(cardData => {
    delete cardData.cardData.id;
    delete cardData.cardData.billing_address;
    delete cardData.cardData.cardholder_name;
    deferred.resolve(cardData);
  }).catch(err => {
    deferred.reject(err.name + ': ' + err.message);
  });
  return deferred.promise;
}

module.exports = service;
