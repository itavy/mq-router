'use strict';

const tap = require('tap');
const { MQRouter } = require('../../lib/latest');
const {
  Fixtures: {
    mqUri: mqURI,
    testConsumerQueue,
  },
} = require('./Fixtures');

tap.test('Send message - work queue', (t) => {
  t.plan(1);
  const s = new MQRouter({
    name: 'sender',
    mqURI,
  });

  const rcv = new MQRouter({
    name: 'receiver',
    mqURI,
  });

  t.tearDown(async () => {
    await s.close();
    await rcv.close();
  });

  const testMessage = Buffer.from('Testing message');

  // eslint-disable-next-line require-jsdoc
  const handler = async ({ message }) => {
    const rez = testMessage.compare(message);
    t.equal(rez, 0);
    return { message: null };
  };

  rcv.subscribe({
    queue: testConsumerQueue,
    handler,
  })
    .then(() => s.sendMessage({
      message:     testMessage,
      destination: {
        queue: testConsumerQueue,
      },
    }));
});
