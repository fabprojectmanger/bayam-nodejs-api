let Q = require('q');
let axios = require("axios");
let StripePayment = require("../schemas/stripe.schema");
let stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const puppeteer = require('puppeteer');
const fs = require('fs');

let service = {};
service.addTagToCustomer = addTagToCustomer;
service.getSripeData = getSripeData;
service.getPaymentHistory = getPaymentHistory;
service.createSubscription = createSubscription;
service.doPayment = doPayment;
service.createCustomer = createCustomer;
service.updateSubscription = updateSubscription;
service.cancelSubscription = cancelSubscription;
service.getStripeCustomerData = getStripeCustomerData;
service.confirmPayment = confirmPayment;
service.getAutorenewAccounts = getAutorenewAccounts;
service.autorenewCron = autorenewCron;
service.deductStripeBalance = deductStripeBalance;

//get stripe customer data
async function getStripeCustomerData(stripeCustomerId, paymentMethodId) {
    let deferred = Q.defer();
    try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        const payment = await stripe.paymentMethods.retrieve(paymentMethodId);
        const customerObject = {
            address: customer.address,
            email: customer.email,
            name: customer.name,
        }
        const paymentObject = {
            cardLast4Number: payment.card.last4,
            cardExpMonth: payment.card.exp_month,
            cardExpYear: payment.card.exp_year
        }
        deferred.resolve({
            customer: customerObject,
            payment: paymentObject
        })
    } catch (error) {
        console.error("Error:", error.message || error.raw.message);
        deferred.reject(error.message || error.raw.message);
    }
    return deferred.promise;
}

//cancels existing subscription
async function cancelSubscription(subscriptionId) {
    let deferred = Q.defer();
    try {
        const subscription = await stripe.subscriptions.del(subscriptionId);
        deferred.resolve(subscription)
    } catch (error) {
        console.error('An error occurred:', error.message);
        deferred.reject(error);
    }
    return deferred.promise;
}

// creates stripe customer
async function createCustomer(body) {
    let deferred = Q.defer();
    const customer = await stripe.customers.create({
        name: body.name,
        email: body.email,
        address: {
            line1: body['address[line1]'],
            line2: body['address[line2]'],
            city: body['address[city]'],
            state: body['address[state]'],
            // postal_code: body['address[postal_code]'],
            country: body['address[country]'],
        },
        payment_method: body.paymentMethodId,
        invoice_settings: {
            default_payment_method: body.paymentMethodId,
        },
    });
    if (customer.id) {
        deferred.resolve({
            stripeCustomerId: customer.id,
            paymentMethodId: body.paymentMethodId
        })
    } else {
        deferred.reject({ error: "Something went wrong try again later!" });
    }
    return deferred.promise;
}

//creates new subscription
async function createSubscription(body, stripeCustomerId) {
    let deferred = Q.defer();
    const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: body.subscriptionPriceId }],
        payment_settings: {
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any',
                },
            },
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription',
        },
        description: `${body.subscriptionName} Subscription`,
        expand: ['latest_invoice.payment_intent'],
    });
    if (subscription.id) {
        const hookLink = subscription.latest_invoice.payment_intent.next_action && subscription.latest_invoice.payment_intent.next_action.use_stripe_sdk.stripe_js;
        confirmPayment(hookLink).then(confirmPayment => {
            deferred.resolve({
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                subscriptionId: subscription.id,
                status: confirmPayment.status,
                created: subscription.latest_invoice.payment_intent.created
            })
        }).catch(err => {
            res.status(200).send({ status: "not confirmed" });
        })
    } else {
        deferred.reject({ error: "Something went wrong try again later!" });
    }
    return deferred.promise;
}

//update existing subscription
async function updateSubscription(body, oldSubscriptionId) {
    let deferred = Q.defer();
    try {
        const subscription = await stripe.subscriptions.retrieve(oldSubscriptionId);
        const updateSubscribe = await stripe.subscriptions.update(oldSubscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: body.subscriptionPriceId,
            }],
            proration_behavior: 'none',
            payment_settings: {
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'any',
                    },
                },
                payment_method_types: ['card'],
                save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
            description: `Subscription Changed to ${body.subscriptionName}`,
        });
        if (updateSubscribe.id) {
            const hookLink = updateSubscribe.latest_invoice.payment_intent.next_action && updateSubscribe.latest_invoice.payment_intent.next_action.use_stripe_sdk.stripe_js;
            confirmPayment(hookLink).then(resp => {
                deferred.resolve({
                    clientSecret: updateSubscribe.latest_invoice.payment_intent.client_secret,
                    subscriptionId: updateSubscribe.id,
                    status: resp.status,
                    created: updateSubscribe.latest_invoice.payment_intent.created
                })
            }).catch(err => {
                deferred.reject({ status: "not confirmed" });
            })
        } else {
            deferred.reject({ error: "Something went wrong try again later!" });
        }
    } catch (error) {
        console.error('Error processing payment:', error.message);
        deferred.reject({ error: 'Error processing payment.' });
    }
    return deferred.promise;
}

//one-time payment
async function doPayment(body, stripeCustomerId, paymentMethodId) {
    let deferred = Q.defer();
    const { amount, name } = body;
    const newAmount = amount && convertAmount(amount);
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: newAmount * 100,
            currency: 'USD',
            description: name ? `Package of $${newAmount}` : `Autorenew payment of $${newAmount}`,
            payment_method: paymentMethodId,
            confirm: true,
            customer: stripeCustomerId,
        });
        deferred.resolve({ paymentIntent: paymentIntent })
    } catch (error) {
        console.error('Error processing payment:', error.message);
        deferred.reject({ error: 'Error processing payment.' });
    }
    return deferred.promise;
}

//confirms one-time payment
async function confirmPayment(confirmLink) {
    let deferred = Q.defer();
    try {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: '/usr/bin/chromium',
            headless: "new"
        });
        const page = await browser.newPage();
        await page.goto(confirmLink);
        const content = await page.content();
        await browser.close();
        if (content.includes("Authentication Complete" || "Success")) {
            deferred.resolve({ status: "success" });
        } else {
            deferred.reject({ status: "failed" });
        }
    } catch (error) {
        console.error('An error occurred:', error);
        deferred.reject({ status: "failed" });
    }
    return deferred.promise;
}

//adds tags to customer in shopify and store data in mongodb
async function addTagToCustomer(customerId, tags) {
    let deferred = Q.defer();
    const url = process.env.SHOPIFY_BASE_URL + `customers/${customerId}.json`;
    const headers = {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
    };
    const requestBody = {
        customer: {
            id: customerId,
            tags: `${tags[0]},${tags[1]},${tags[2]}`
        },
    };
    try {
        const response = await axios.put(url, requestBody, { headers });
        const customerData = {
            id: response.data.customer.id,
            tags: response.data.customer.tags,
        };
        deferred.resolve(customerData);
    } catch (error) {
        deferred.reject("Error" + ': ' + error.response);
    }
    return deferred.promise;
}

//fetch customers stripe data
function getSripeData(customerId) {
    let deferred = Q.defer();
    const query = {
        customerId: customerId
    }
    StripePayment.find(query).then(data => {
        if (data.length > 0) {
            deferred.resolve({ body: data[0] });
        } else {
            deferred.resolve({ body: null });
        }
    }).catch(err => {
        console.error('There was an error retrieving the customers data ', err);
        deferred.reject('Error retrieving customer\'s data');
    })
    return deferred.promise;
}

//fetches all data
function getAutorenewAccounts() {
    let deferred = Q.defer();
    const query = {
        isAutorenew: true,
        balance: { $lt: 10 },
        subscriptionStatus: "Active"
    }
    StripePayment.find(query).then(data => {
        if (data.length > 0) {
            deferred.resolve(data);
        } else {
            deferred.resolve([]);
        }
    }).catch(err => {
        console.error('There was an error retrieving the customers data ', err);
        deferred.reject('Error retrieving customer\'s data');
    })
    return deferred.promise;
}

// fetches customer's stripe payment history
async function getPaymentHistory(customerId) {
    let deferred = Q.defer();
    try {
        const payments = await stripe.paymentIntents.list({
            customer: customerId,
            expand: ['data.charges'],
        });
        deferred.resolve(payments.data);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        deferred.reject('Error retrieving payment history');
    }
    return deferred.promise;
}


function convertAmount(amount) {
    if (typeof amount === 'number') {
        return amount; // If amount is already a number, return it as is
    } else if (typeof amount === 'string') {
        return Number(amount.replace(",", "")); // Convert string to number after removing commas
    } else {
        return null; // Return null or appropriate value for other cases
    }
}

//cron for autorenewal of package
function autorenewCron(customerData) {
    const currentDate = new Date();
    doPayment({ amount: customerData.packagePrice }, customerData.stripeCustomerId, customerData.paymentMethodId).then(paymentResp => {
        if (paymentResp.paymentIntent) {
            confirmPayment(paymentResp.paymentIntent.next_action.use_stripe_sdk.stripe_js).then(confirmPayment => {
                if (confirmPayment.status === "success") {
                    const filter = { customerId: customerData.customerId };
                    const record = {
                        balance: customerData.balance + customerData.packageQuantity,
                    }
                    const options = {
                        upsert: true,
                        new: true
                    };
                    StripePayment.findOneAndUpdate(filter, record, options).then(doc => {
                        const logData = `${currentDate} | cron working | customerId=${customerData.customerId} || status="success"
                        `;
                        fs.appendFile('stripe.log', logData, (err) => {
                            if (err) {
                                console.error('Error writing to log file:', err);
                            }
                        });
                    }).catch(err => {
                        const logData = `${currentDate} | cron error | customerId=${customerData.customerId} || ${err} || status="error updating in database"`;
                        fs.appendFile('stripe.log', logData, (err) => {
                            if (err) {
                                console.error('Error writing to log file:', err);
                            }
                        });
                    })
                } else {
                    const logData = `${currentDate} | cron error | customerId=${customerData.customerId} || ${err} || status="puppeteer issue"`;
                    fs.appendFile('stripe.log', logData, (err) => {
                        if (err) {
                            console.error('Error writing to log file:', err);
                        }
                    });
                }
            }).catch(err => {
                const logData = `${currentDate} | cron error | customerId=${customerData.customerId} || ${err} || status="Unable to confirm"`;
                fs.appendFile('stripe.log', logData, (err) => {
                    if (err) {
                        console.error('Error writing to log file:', err);
                    }
                });
            })
        } else {
            const logData = `${currentDate} | cron error | customerId=${customerData.customerId} || ${paymentResp.error} || status="Something went wrong while payment"`;
            fs.appendFile('stripe.log', logData, (err) => {
                if (err) {
                    console.error('Error writing to log file:', err);
                }
            });
        }
    }).catch(err => {
        const logData = `${currentDate} | cron error | customerId=${customerData.customerId} || ${err} || status="Unable to do payment"`;
        fs.appendFile('stripe.log', logData, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    })
}

function deductStripeBalance(totalPrice, customerId) {
    let deferred = Q.defer();
    StripePayment.findOne({ customerId: customerId }).then(points => {
        if (points) {
            let newQuantity = points.balance - totalPrice;
            StripePayment.findOneAndUpdate({ customerId: customerId }, { balance: newQuantity }).then(updatedPoints => {
                deferred.resolve(updatedPoints);
            }).catch(err => {
                deferred.reject(err.name + ': ' + err.message);
            })
        } else {
            deferred.resolve('No points to get!');
        }
    }).catch(err => {
        deferred.reject(err.name + ': ' + err.message);
    })
    return deferred.promise;
}

module.exports = service;