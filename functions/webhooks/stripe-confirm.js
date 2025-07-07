// functions/webhooks/stripe-confirm.js
exports.handler = async function (context, event, callback) {
  const stripe = require('stripe')(context.STRIPE_SECRET_KEY);
  const client = context.getTwilioClient();
  const syncServiceSid = context.SYNC_SERVICE_SID;
  
  const signature = event.headers['stripe-signature'];
  const webhookSecret = context.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);
  } catch (err) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    return callback(null, { statusCode: 400, body: `Webhook Error: ${err.message}` });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const numberToPurchase = session.metadata.number_to_purchase;
    // UPDATED: Retrieve the owner's ID from the metadata
    const ownerId = session.metadata.owner_id; 

    if (!numberToPurchase || !ownerId) {
        console.error("Webhook missing required metadata.");
        return callback(null, { statusCode: 400, body: 'Missing metadata.' });
    }

    try {
      const purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: numberToPurchase,
        smsUrl: `https://${context.DOMAIN_NAME}/webhooks/incoming-sms`,
      });

      const masterList = client.sync.v1.services(syncServiceSid).syncLists('master_number_list');
      await masterList.syncListItems.create({
        data: {
          number: purchasedNumber.phoneNumber.replace('+', ''),
          isPublic: false,
          isArchived: false,
          isPremium: true,
          ownerId: ownerId, // Save the correct owner ID
        },
      });
      console.log(`Successfully purchased ${numberToPurchase} for user ${ownerId}`);

    } catch (error) {
      console.error(`Failed to purchase Twilio number after payment: ${error}`);
      return callback(null, { statusCode: 500, body: 'Internal Server Error' });
    }
  }

  return callback(null, { statusCode: 200, body: 'Success' });
};