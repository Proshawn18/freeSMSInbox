// functions/webhooks/incoming-sms.js
exports.handler = async function(context, event, callback) {
  const { To, From, Body, MediaUrl0 } = event;
  console.log(`New message to ${To} from ${From}. Starting process...`);

  const syncServiceSid = context.SYNC_SERVICE_SID;
  const client = context.getTwilioClient();

  const normalize = (num) => num.replace(/\D/g, "");
  const normalizedTo = normalize(To);

  const messagesListName = `messages_${normalizedTo}`;
  const masterListName = 'master_number_list';
  
  const newMessage = { 
      from: From, 
      body: Body, 
      timestamp: new Date().toISOString(),
      mediaUrl: MediaUrl0 || null
  };

  try {
    // --- Step 1: Save the message to its dedicated list ---
    // This logic ensures the message-specific list is created if it doesn't exist.
    console.log(`Attempting to save message to list: ${messagesListName}`);
    try {
        await client.sync.v1.services(syncServiceSid)
          .syncLists(messagesListName)
          .syncListItems
          .create({ data: newMessage, ttl: 30 * 24 * 60 * 60 });
        console.log('Message saved successfully.');
    } catch (e) {
        if (e.code === 20404) { // List does not exist
            console.log(`List ${messagesListName} not found. Creating it...`);
            await client.sync.v1.services(syncServiceSid).syncLists.create({ uniqueName: messagesListName });
            await client.sync.v1.services(syncServiceSid).syncLists(messagesListName).syncListItems.create({ data: newMessage, ttl: 30 * 24 * 60 * 60 });
            console.log('List created and message saved.');
        } else {
            throw e; // Re-throw other errors
        }
    }

    // --- Step 2: Add the number to the master list if it's new ---
    // This is the new, more robust logic.
    console.log(`Checking master list for number: ${normalizedTo}`);
    const allLists = await client.sync.v1.services(syncServiceSid).syncLists.list();
    const masterListExists = allLists.some(list => list.uniqueName === masterListName);

    if (!masterListExists) {
        // If the master list doesn't exist at all, this must be the first number.
        // Create the list AND add the first number in one go.
        console.log(`Master list not found. Creating it and adding first number...`);
        await client.sync.v1.services(syncServiceSid).syncLists.create({ uniqueName: masterListName });
        await client.sync.v1.services(syncServiceSid).syncLists(masterListName).syncListItems.create({ 
            data: { number: normalizedTo, isPublic: true, isArchived: false, isPremium: false } 
        });
        console.log('Master list created and number added.');
    } else {
        // If the master list exists, check if this specific number is in it.
        const listItems = await client.sync.v1.services(syncServiceSid).syncLists(masterListName).syncListItems.list({ limit: 1000 });
        const numberExists = listItems.some(item => item.data && item.data.number === normalizedTo);

        if (!numberExists) {
            console.log(`Adding new number to master list: ${normalizedTo}`);
            await client.sync.v1.services(syncServiceSid).syncLists(masterListName).syncListItems.create({ 
                data: { number: normalizedTo, isPublic: true, isArchived: false, isPremium: false } 
            });
            console.log('Number added to master list.');
        } else {
            console.log('Number already exists in master list.');
        }
    }
    
    console.log("Process completed successfully.");

  } catch (error) {
    console.error(`FATAL ERROR in incoming-sms webhook: ${error}`);
  }

  // Always respond to Twilio to prevent retries
  const twiml = new Twilio.twiml.MessagingResponse();
  callback(null, twiml);
};
