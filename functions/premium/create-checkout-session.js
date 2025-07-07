// functions/premium/create-checkout-session.js
exports.handler = async function (context, event, callback) {
  const stripe = require('stripe')(context.STRIPE_SECRET_KEY);
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  const { numberToBuy, userIdentity } = event;

  if (!numberToBuy || !userIdentity) {
    response.setStatusCode(400).setBody({ error: 'Number to buy and user identity are required.' });
    return callback(null, response);
  }

  const domainUrl = `https://${context.DOMAIN_NAME}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Premium Phone Number: ${numberToBuy}`,
            },
            unit_amount: 500, // $5.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // UPDATED: Pass the logged-in user's identity to the webhook
      metadata: {
        number_to_purchase: numberToBuy,
        owner_id: userIdentity 
      },
      success_url: `${domainUrl}/dashboard.html?payment=success`, // Redirect to dashboard on success
      cancel_url: `${domainUrl}/premium.html?payment=cancelled`,
    });

    response.setBody({ sessionId: session.id });
    return callback(null, response);
  } catch (error) {
    console.error('Stripe Session Error:', error);
    response.setStatusCode(500).setBody({ error: 'Could not create payment session.' });
    return callback(null, response);
  }
};