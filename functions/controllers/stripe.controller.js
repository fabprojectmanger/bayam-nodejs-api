let express = require("express");
let router = express.Router();
let StripePayment = require("../schemas/stripe.schema");
let StripeService = require("../services/stripe.service");
let UserCredits = require("../schemas/points.schema");
const cron = require('node-cron');

cron.schedule('0 6 * * *', async () => {
    try {
        const customerData = await StripeService.getAutorenewAccounts();
        if (customerData.length > 0) {
            for (let i = 0; i < customerData.length; i++) {
                StripeService.autorenewCron(customerData[i]);
            }
        }
    } catch (error) {
        console.error('Error retrieving customer data:', error);
    }
});

// creates customer
router.post('/create-customer', (req, res) => {
    StripeService.getSripeData(req.query.customerId).then((response) => {
        if (response.body) {
            res.status(200).send({
                stripeCustomerId: response.body.stripeCustomerId,
                paymentMethodId: response.body.paymentMethodId
            })
        } else {
            StripeService.createCustomer(req.body).then((customer) => {
                const filter = { customerId: req.query.customerId };
                const record = {
                    customerId: req.query.customerId,
                    stripeCustomerId: customer.stripeCustomerId,
                    paymentMethodId: customer.paymentMethodId,
                }
                const options = {
                    upsert: true,
                    new: true
                };
                StripePayment.findOneAndUpdate(filter, record, options).then(doc => {
                    res.status(200).send(customer)
                }).catch(err => {
                    console.log("Error saving or updating customize product", err);
                })
            }).catch(err => {
                console.log("errr customer", err)
            })
        }
    }).catch((error) => {
        console.error('Error adding tag to customer:', error.message);
    });
})

//creates new subscription or update existing subscription
router.post('/create-subscription', (req, res) => {
    StripeService.getSripeData(req.query.customerId).then((response) => {
        if (response.body) {
            if (response.body.subscriptionId && response.body.subscriptionStatus !== "Stopped") {
                StripeService.updateSubscription(req.body, response.body.subscriptionId).then((response) => {
                    res.status(200).send(response)
                }).catch(err => {
                    console.error("update errr", err)
                })
            } else {
                StripeService.createSubscription(
                    req.body,
                    response.body.stripeCustomerId
                ).then((response) => {
                    res.status(200).send(response)
                }).catch(err => {
                    console.error("create errr", err)
                })
            }
        }
    })
        .catch((error) => {
            console.error('Error getting customer data:', error.message);
        });
})

// Route to handle one-time payment
router.post('/one-time-payment', (req, res) => {
    StripeService.getSripeData(req.query.customerId).then((customerData) => {
        if (customerData.body) {
            StripeService.doPayment(req.body, customerData.body.stripeCustomerId, customerData.body.paymentMethodId).then(paymentResp => {
                if (paymentResp.paymentIntent) {
                    StripeService.confirmPayment(paymentResp.paymentIntent.next_action.use_stripe_sdk.stripe_js).then(confirmPayment => {
                        res.status(200).send(confirmPayment);
                    }).catch(err => {
                        res.status(200).send({ status: "not confirmed" });
                    })
                } else {
                    res.status(400).send({
                        stripeCustomerId: customerData.stripeCustomerId,
                        error: paymentResp.error
                    });
                }
            }).catch(err => {
                res.status(400).send({ error: err })
            })
        } else {
            res.status(400).send({ error: "No customer" });
        }
    })
        .catch((error) => {
            console.error('Error processing payment: ', error.message);
            res.status(400).send('Error processing payment: ', error);
        });
});

//saves stripe payment data
router.post('/payment-save', (req, res) => {
    const {
        packageDiscount,
        packageQuantity,
        packagePrice,
        subscriptionId,
        subscriptionDate
    } = req.body;
    const newPackageQuantity = packageQuantity && packageQuantity.replace(",", "");
    const newPackageDiscount = packageDiscount && packageDiscount.replace(",", "");
    const newPackagePrice = packagePrice && packagePrice.replace(",", "");

    const tagsToAdd = [`subscribe_${req.body.subscriptionName || "free"}`, `packageper_${newPackageDiscount}`, `package_${newPackageQuantity}`];

    const currentDate = subscriptionDate && new Date(subscriptionDate * 1000);
    let record = {};
    const options = { upsert: true, new: true };
    UserCredits.find({ shopifyCustomerId: req.query.customerId }).then(data => {
        // old credit balance
        const oldBalance = data.length > 0 ? Math.round(data[0].quantity) : 0;
        StripePayment.find({ customerId: req.query.customerId }).then(stripeData => {
            //check stripe balance
            const stripeBalance = stripeData.length > 0 ? Math.round(stripeData[0].balance) : 0;
            const add_3 = stripeData.length > 0 ? stripeBalance + Number(newPackageQuantity) : oldBalance + stripeBalance + Number(newPackageQuantity);
            if (req.body.paymentOnly) {
                record = {
                    packageQuantity: Number(newPackageQuantity),
                    packageDiscount: Number(newPackageDiscount),
                    packagePrice: Number(newPackagePrice),
                    isAutorenew: req.body.isAutorenew || false,
                    balance: add_3
                }
            } else if (req.body.isSubscriptionOnly) {
                record = {
                    subscription: req.body.subscriptionName,
                    subscriptionId: subscriptionId,
                    startingDate: currentDate,
                    subscriptionStatus: "Active",
                    balance: oldBalance
                }
            }
            StripePayment.findOneAndUpdate({ customerId: req.query.customerId }, record, options).then(doc => {
                StripeService.addTagToCustomer(req.query.customerId, tagsToAdd).then((resp) => {
                    res.status(200).send(resp);
                }).catch((error) => {
                    console.log('Error adding tag to customer:', error);
                    res.status(400).send('Error adding tag to customer');
                });
            }).catch((error) => {
                console.log("Error saving or updating customize product", error);
                res.status(400).send('Error saving or updating customize product: ', error);
            });
        }).catch(err => {
            console.log('Error finding customer!', err);
            res.status(400).send('Error finding customer!');
        })
    }).catch(err => {
        console.log("err >>>", err)
        res.status(400).send('Error finding user points!');
    })
})

//stops current running subscription
router.get('/stop-subscription', (req, res) => {
    const record = {
        subscriptionStatus: "Canceled",
    }
    const filter = { customerId: req.query.customerId };
    const options = { upsert: true, new: true };
    StripeService.getSripeData(req.query.customerId).then((userData) => {
        if (userData.body && userData.body.subscriptionId) {
            if (userData.body.subscriptionStatus === "Active") {
                StripeService.cancelSubscription(userData.body.subscriptionId).then((response) => {
                    if (response.status === 'canceled') {
                        StripePayment.findOneAndUpdate(filter, record, options).then(doc => {
                            res.status(200).send({ status: "Canceled" });
                        }).catch((error) => {
                            console.log("Error saving or updating customize product", error);
                            res.status(400).send('Error saving or updating customize product: ', error.message);
                        });
                    }
                })
                    .catch((error) => {
                        console.error('Error adding tag to customer:', error.message);
                        res.status(400).send({ error: 'Something went wrong. Try again later!' });
                    });
            } else {
                res.status(200).send({ status: "Canceled" });
            }
        } else {
            res.status(200).send({ status: "No Subscription" });
        }
    })
        .catch((error) => {
            console.error('Error fetching customer data!', error);
            res.status(400).send({ error: 'Error fetching customer data!' });
        });
})

//retrieves customer stripe data
router.get('/customer-data', (req, res) => {
    StripeService.getSripeData(req.query.customerId).then((response) => {
        if (response.body) {
            StripeService.getStripeCustomerData(response.body.stripeCustomerId, response.body.paymentMethodId).then((stripeData) => {
                res.status(200).send({
                    stripe: response.body,
                    customer: stripeData.customer,
                    payment: stripeData.payment
                });
            })
                .catch((error) => {
                    console.error('Error adding tag to customer:', error);
                    res.status(400).send({ error: "Error retrieving customer data" });
                });
        } else {
            res.status(200).send({ error: "Customer not found!" });
        }
    })
        .catch((error) => {
            console.error('Error adding tag to customer:', error);
            res.status(400).send({ error: "Error retrieving customer data" });
        });
})

//retrieves payment history
router.get('/payment-history', (req, res) => {
    StripeService.getSripeData(req.query.customerId).then((response) => {
        if (response.body && response.body.stripeCustomerId) {
            StripeService.getPaymentHistory(response.body.stripeCustomerId).then((paymentHistory) => {
                res.status(200).send(paymentHistory);
            }).catch((error) => {
                console.error('Error:', error);
            });
        } else {
            res.status(400).send({ error: "No customer" });
        }
    })
        .catch((error) => {
            console.error('Error adding tag to customer:', error);
            res.status(400).send({ error: 'Error fetching customer history!' });
        });
})

//stops autorenew package
router.get('/stop-autorenew', (req, res) => {
    const filter = { customerId: req.query.customerId };
    const options = { upsert: true, new: true };
    StripeService.getSripeData(req.query.customerId).then((response) => {
        if (response.body) {
            const record = {
                isAutorenew: !response.body.isAutorenew
            }
            StripePayment.findOneAndUpdate(filter, record, options).then(doc => {
                res.status(200).send({
                    status: "Success",
                    isAutorenew: doc.isAutorenew
                });
            }).catch((error) => {
                console.log("Error changing Autorenew status!", error);
                res.status(400).send({ error: 'Error changing Autorenew status!' });
            });
        } else {
            res.status(400).send({ error: "No customer" });
        }
    })
        .catch((error) => {
            console.error('Error fetching customer data', error);
            res.status(400).send({ error: 'Error fetching customer data!' });
        });
})

module.exports = router;