// functions/premium/find-numbers.js
exports.handler = async function(context, event, callback) {
    const client = context.getTwilioClient();
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

    const { areaCode, contains } = event;

    if (!areaCode) {
        response.setStatusCode(400).setBody({ error: 'Area code is required.' });
        return callback(null, response);
    }

    try {
        const available = await client.availablePhoneNumbers('US').local.list({
            areaCode: areaCode,
            contains: contains || null,
            smsEnabled: true,
            limit: 20
        });

        const numbers = available.map(n => n.phoneNumber);
        response.setBody({ numbers });
        return callback(null, response);

    } catch (error) {
        console.error(`Find Numbers Error: ${error}`);
        response.setStatusCode(500).setBody({ error: 'Could not search for numbers.' });
        return callback(null, response);
    }
};