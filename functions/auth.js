// functions/auth.js
exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');


  const { action, to, code } = event;

  if (!to) {
    response.setStatusCode(400).setBody({ success: false, error: 'Phone number is required.' });
    return callback(null, response);
  }

  // --- THE FIX: NORMALIZE THE PHONE NUMBER ---
  // This simple helper ensures the number is in E.164 format
  const normalizeE164 = (phoneNumber) => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    return phoneNumber; // Assume it's already formatted if it's not a 10/11 digit US number
  };

  const formattedTo = normalizeE164(to);
  // ------------------------------------------

  try {
    switch (action) {
      case 'start-verification': {
        console.log(`Starting verification for ${formattedTo}`);
        const verification = await client.verify.v2
          .services(context.VERIFY_SERVICE_SID)
          .verifications.create({ to: formattedTo, channel: 'sms' }); // Use the formatted number

        console.log('Verification response:', verification);

        response.setBody({ success: true, status: verification.status });
        break;
      }
      case 'check-verification': {
        if (!code) {
          response.setStatusCode(400).setBody({ success: false, error: 'Code is required.' });
          return callback(null, response);
        }
        console.log(`Checking verification for ${formattedTo} with code ${code}`);
        const verificationCheck = await client.verify.v2
          .services(context.VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: formattedTo, code: code }); // Use the formatted number

        if (verificationCheck.status === 'approved') {
          response.setBody({ success: true, status: verificationCheck.status });
        } else {
          response.setStatusCode(400).setBody({ success: false, error: 'Incorrect code.' });
        }
        break;
      }
      default:
        response.setStatusCode(400).setBody({ success: false, error: 'Invalid action.' });
        break;
    }
    return callback(null, response);
  } catch (error) {
    console.error(`Auth Error: ${error}`);
    // Pass the specific error message from Twilio back to the frontend
    response.setStatusCode(500).setBody({ success: false, error: ""||error.message });
    return callback(null, response);
  }
};