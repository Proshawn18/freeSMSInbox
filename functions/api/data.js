// functions/api/data.js
exports.handler = async function(context, event, callback) {
  const client = context.getTwilioClient();
  const syncServiceSid = context.SYNC_SERVICE_SID;
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  const { query, number, q } = event;

  try {
    switch(query) {
      case 'my-numbers': {
        const userIdentity = event.userIdentity;
        if (!userIdentity) {
            response.setStatusCode(401).setBody({ error: 'User identity is required.' });
            return callback(null, response);
        }
        const list = await client.sync.v1.services(syncServiceSid).syncLists('master_number_list').syncListItems.list({ limit: 1000 });
        
        // Filter for numbers owned by the current user
        const myNumbers = list
            .filter(item => item.data && item.data.ownerId === userIdentity)
            .map(item => item.data); // Return the full data object

        response.setBody(myNumbers);
        break;
      }
      case 'public-numbers': {
        // YOUR FIX APPLIED HERE: Changed .getPage() to .list()
        const list = await client.sync.v1.services(syncServiceSid).syncLists('master_number_list').syncListItems.list({ limit: 100 });
        
        const publicNumbers = list
            .filter(item => item.data && item.data.isPublic && !item.data.isArchived)
            .map(item => item.data.number);

        response.setBody(publicNumbers);
        break;
      }
      
      case 'messages': {
        if (!number) {
          response.setStatusCode(400).setBody({ error: 'Phone number is required.' });
          return callback(null, response);
        }
        const listItems = await client.sync.v1.services(syncServiceSid)
          .syncLists(`messages_${number}`)
          .syncListItems
          .list({ order: 'desc', limit: 50 });
        const messages = listItems.map(item => ({...item.data, sid: item.index}));
        response.setBody(messages);
        break;
      }

      case 'search': {
          // CORRECTED: Changed .getPage() to .list() here as well.
          const masterList = await client.sync.v1.services(syncServiceSid).syncLists('master_number_list').syncListItems.list({ limit: 1000 });
          
          const allNumbers = masterList
            .filter(item => item.data)
            .map(item => item.data.number);

          let results = [];
          const searchQuery = q ? q.toLowerCase() : '';
          for (const num of allNumbers) {
              // CORRECTED: Ensure we are using .list() for message retrieval too.
              const messages = await client.sync.v1.services(syncServiceSid).syncLists(`messages_${num}`).syncListItems.list();
              messages.forEach(m => {
                  if (m.data && m.data.body && m.data.from && (m.data.body.toLowerCase().includes(searchQuery) || m.data.from.toLowerCase().includes(searchQuery))) {
                      results.push({ ...m.data, number: num });
                  }
              });
          }
          response.setBody(results);
          break;
      }

      default:
        response.setStatusCode(400).setBody({ error: 'Invalid query type.' });
        break;
    }
    return callback(null, response);
  } catch (error) {
    if (error.code === 20404) {
        response.setBody([]);
        return callback(null, response);
    }
    console.error(`API Error: ${error}`);
    response.setStatusCode(500).setBody({ error: 'Could not fetch data.' });
    return callback(null, response);
  }
};