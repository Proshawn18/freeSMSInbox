// functions/admin/actions.js
exports.handler = async function(context, event, callback) {
    const client = context.getTwilioClient();
    const syncServiceSid = context.SYNC_SERVICE_SID;
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

    const { key, action, number, messageIndex } = event;

    // --- Security Check ---
    if (key !== context.ADMIN_KEY) {
        response.setStatusCode(401).setBody({ error: 'Unauthorized' });
        return callback(null, response);
    }

    try {
        const masterList = client.sync.v1.services(syncServiceSid).syncLists('master_number_list');

        switch (action) {
            case 'archive':
            case 'unarchive': {
                const items = await masterList.syncListItems.list({ pageSize: 1000 });
                const itemToUpdate = items.find(i => i.data.number === number);

                if (!itemToUpdate) {
                    response.setStatusCode(404).setBody({ error: 'Number not found in master list.' });
                    return callback(null, response);
                }

                const updatedData = { ...itemToUpdate.data, isArchived: action === 'archive' };
                await masterList.syncListItems(itemToUpdate.index).update({ data: updatedData });
                response.setBody({ success: true, number, status: action });
                break;
            }
            case 'delete-message': {
                const messageList = client.sync.v1.services(syncServiceSid).syncLists(`messages_${number}`);
                await messageList.syncListItems(messageIndex).remove();
                response.setBody({ success: true, messageIndex, status: 'deleted' });
                break;
            }
            default:
                response.setStatusCode(400).setBody({ error: 'Invalid admin action.' });
                break;
        }
        return callback(null, response);
    } catch (error) {
        console.error(`Admin Action Error: ${error}`);
        response.setStatusCode(500).setBody({ error: 'Could not perform admin action.' });
        return callback(null, response);
    }
};