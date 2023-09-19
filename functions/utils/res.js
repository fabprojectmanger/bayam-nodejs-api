function response(responseBody, errorBody) {
  let newResponse = {};
  newResponse.result = responseBody || [];
  newResponse.errors = errorBody || [];
  return newResponse;
}

module.exports = response;