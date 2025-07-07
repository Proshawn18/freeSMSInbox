// functions/api/token.js
// CORRECTED: This is the robust, correct way to import these modules.
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const SyncGrant = AccessToken.SyncGrant;

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  // A unique identity for the user. For a real app, this would be a username or user ID.
  const identity = event.identity || 'web-user-' + Date.now();

  // Your Twilio credentials should be stored as environment variables
  // API Key/Secret is the recommended best practice
  const token = new AccessToken(
    context.ACCOUNT_SID,
    context.TWILIO_API_KEY,
    context.TWILIO_API_SECRET,
    { identity: identity, ttl: 3600 } // Token is valid for 1 hour
  );

  // Grant access to the Sync service
  const syncGrant = new SyncGrant({
    serviceSid: context.SYNC_SERVICE_SID,
  });
  token.addGrant(syncGrant);

  response.setBody({
    identity: identity,
    token: token.toJwt(),
  });

  return callback(null, response);
};