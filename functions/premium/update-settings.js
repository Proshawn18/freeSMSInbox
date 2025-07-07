// functions/premium/update-settings.js
exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const syncServiceSid = context.SYNC_SERVICE_SID;
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  const {
    user, // The logged-in user's identity (their phone number)
    numberToUpdate,
    autoReplyMessage,
    notificationEmail,
  } = event;

  // Basic security: Ensure a user is passed
  if (!user) {
    response.setStatusCode(401).setBody({ error: 'Authentication required.' });
    return callback(null, response);
  }

  try {
    const masterList = client.sync.v1.services(syncServiceSid).syncLists('master_number_list');
    const items = await masterList.syncListItems.list({ pageSize: 1000 });
    const itemToUpdate = items.find(i => i.data.number === numberToUpdate);

    if (!itemToUpdate) {
      response.setStatusCode(404).setBody({ error: 'Premium number not found.' });
      return callback(null, response);
    }
    
    // CRITICAL SECURITY CHECK: Ensure the logged-in user owns this number
    if (itemToUpdate.data.ownerId !== user) {
        response.setStatusCode(403).setBody({ error: 'Permission denied.' });
        return callback(null, response);
    }

    // Prepare the new data, merging with existing data
    const updatedData = {
        ...itemToUpdate.data,
        autoReplyMessage: autoReplyMessage || "", // Use empty string if blank
        notificationEmail: notificationEmail || "",
    };

    // Update the item in the Sync List
    await masterList.syncListItems(itemToUpdate.index).update({ data: updatedData });
    
    response.setBody({ success: true, data: updatedData });
    return callback(null, response);

  } catch (error) {
    console.error(`Update Settings Error: ${error}`);
    response.setStatusCode(500).setBody({ error: 'Could not update settings.' });
    return callback(null, response);
  }
};