import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const [{ pageId, senderIds: [recipient] }] = JSON.parse(process.env.META_MESSENGER_PAGES);
const tokens = JSON.parse(process.env.META_MESSENGER_PAGE_TOKENS);
const graphPath = 'https://graph.facebook.com/' + process.env.META_MESSENGER_GRAPH_VERSION + '/' + pageId + '/messages';

globalThis.fetch = async (url, init) => {
    assert.equal(url, graphPath);
    assert.ok(init.method === 'POST' && init.redirect === 'error' && init.headers.authorization === 'Bearer ' + tokens[pageId]);
    assert.deepEqual(JSON.parse(init.body), {
        messaging_type: 'RESPONSE', recipient: { id: recipient }, message: { text: 'Trả lời Firefox Liên hệ Messenger' },
    });
    console.log('Meta reply fixture accepted one POST.');
    return new globalThis.Response(JSON.stringify({ recipient_id: recipient, message_id: randomUUID() }));
};
