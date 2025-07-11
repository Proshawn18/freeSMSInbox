// functions/api/subscribe.js
const https = require('https');

exports.handler = function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  const { email, honeypot_field } = event;
  const apiKey = context.BUTTONDOWN_API_KEY;

  // Bot check
  if (honeypot_field && honeypot_field !== '') {
    console.log('Honeypot triggered — bot likely.');
    response.setBody({ success: true });
    return callback(null, response);
  }

  if (!apiKey) {
    response.setStatusCode(500).setBody({ error: 'Buttondown API key not set.' });
    return callback(null, response);
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    response.setStatusCode(400).setBody({ error: 'Valid email required.' });
    return callback(null, response);
  }

  // --- Prepare request body and options ---
  const postData = JSON.stringify({
    email_address: email,
    type: 'regular' // disables double opt-in
  });

  const options = {
    hostname: 'api.buttondown.email',
    port: 443,
    path: '/v1/subscribers',
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Buttondown-Collision-Behavior': 'overwrite'
    }
  };

  // --- HTTPS Request ---
  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Buttondown response code:', res.statusCode);
      console.log('Buttondown response body:', body);

      if (res.statusCode === 201 || res.statusCode === 400) {
        response.setBody({ success: true });
      } else {
        response.setStatusCode(500).setBody({
          error: 'Could not subscribe at this time.',
          details: body
        });
      }

      callback(null, response);
    });
  });

  req.on('error', (e) => {
    console.error('Buttondown HTTPS error:', e);
    response.setStatusCode(500).setBody({ error: 'Internal server error.' });
    callback(null, response);
  });

  req.write(postData);
  req.end();
};
