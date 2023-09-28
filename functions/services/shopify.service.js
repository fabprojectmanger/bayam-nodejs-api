let axios = require("axios");
let crypto = require('crypto');
let SHARED_SECRET = process.env.SHOPIFY_SHARED_SECRET;
let WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

const SHOPIFY_BASE_URL = process.env.SHOPIFY_BASE_URL;
const HEADER = {
  'X-Shopify-Access-Token': process.env.X_SHOPIFY_ACCESS_TOKEN,
  'Content-Type': 'application/json'
};

async function getCall(params) {
  try {
    let url = `${SHOPIFY_BASE_URL}${params}`;
    console.log("URL ...................",url);
    const response = await axios.get(url, { headers: HEADER });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function postCall(params, payload) {
  try {
    let url = `${SHOPIFY_BASE_URL}${params}`;
    const response = await axios.post(url, JSON.stringify(payload), { headers: HEADER });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function putCall(params, payload) {
  try {
    let url = `${SHOPIFY_BASE_URL}${params}`;
    const response = await axios.put(url, JSON.stringify(payload), { headers: HEADER });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function deleteCall(params) {
  try {
    let url = `${SHOPIFY_BASE_URL}${params}`;
    const response = await axios.delete(url, { headers: HEADER });
    return response.data;
  } catch (error) {
    throw error;
  }
}

function validateSignature(query, secret) {
  secret = secret || SHARED_SECRET;
  let parameters = [];
  for (let key in query) {
    if (key != 'signature') {
      parameters.push(key + '=' + query[key])
    }
  }
  let message = parameters.sort().join('');
  let digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return digest === query.signature;
};

function validateTime(query) {
  if (Math.round(new Date().getTime() / 1000) - query.timestamp > 30) {
    return false;
  }
  return true;
}

function validateWebhookSignature(rawBody, hmacHeader) {

  // Create a hash using the body and our key
  const generated_hash = crypto.
    createHmac('sha256', WEBHOOK_SECRET).
    update(rawBody).
    digest('base64');

  return (generated_hash === hmacHeader);
}


module.exports = {
  getCall,
  postCall,
  putCall,
  deleteCall,
  validateSignature,
  validateTime,
  validateWebhookSignature,
}