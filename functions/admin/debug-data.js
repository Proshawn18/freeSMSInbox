// functions/admin/debug-data.js
exports.handler = async function(context, event, callback) {
    const client = context.getTwilioClient();
    const syncServiceSid = context.SYNC_SERVICE_SID;
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

    const { key, action, listSid } = event;

    // --- Security Check ---
    if (key !== context.ADMIN_KEY) {
        response.setStatusCode(401).setBody({ error: 'Unauthorized' });
        return callback(null, response);
    }

    try {
        switch(action) {
            case 'get-all-lists': {
                const lists = await client.sync.v1.services(syncServiceSid).syncLists.list();
                const listData = lists.map(l => ({ sid: l.sid, uniqueName: l.uniqueName, dateCreated: l.dateCreated }));
                response.setBody({ lists: listData });
                break;
            }
            case 'get-list-items': {
                if (!listSid) {
                    response.setStatusCode(400).setBody({ error: 'listSid is required.' });
                    return callback(null, response);
                }
                const items = await client.sync.v1.services(syncServiceSid).syncLists(listSid).syncListItems.list({ limit: 50 });
                const itemData = items.map(i => ({ index: i.index, data: i.data, dateExpires: i.dateExpires }));
                response.setBody({ items: itemData });
                break;
            }
            default:
                response.setStatusCode(400).setBody({ error: 'Invalid debug action.' });
                break;
        }
        return callback(null, response);

    } catch (error) {
        console.error(`Debug Data Error: ${error}`);
        response.setStatusCode(500).setBody({ error: 'Could not fetch debug data.' });
        return callback(null, response);
    }
};