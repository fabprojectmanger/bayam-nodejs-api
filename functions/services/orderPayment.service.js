const base = process.env.SANDBOX_URL;
const generateAccessToken = async () => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
        throw new Error("MISSING_API_CREDENTIALS");
      }
      const auth = Buffer.from(
        process.env.PAYPAL_CLIENT_ID+ ":" + process.env.PAYPAL_SECRET,
      ).toString("base64");
      const response = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
  
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Failed to generate Access Token:", error);
    }
  };
  async function handleResponse(response) {
    try {
      const jsonResponse = await response.json();
      return {
        jsonResponse,
        httpStatusCode: response.status,
      };
    } catch (err) {
      const errorMessage = await response.text();
      throw new Error(errorMessage);
    }
  }
async function createOrder(cart){
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: "100.00",
          },
        },
      ],
    };
  
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: JSON.stringify(payload),
    });
  
    return handleResponse(response);
  };
  

module.exports = {
	createOrder
}