// functions/api/config.js
exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  // Expose public-safe environment variables to the frontend
  const publicConfig = {
    stripePublishableKey: context.STRIPE_PUBLISHABLE_KEY
  };

  response.setBody(publicConfig);
  return callback(null, response);
};