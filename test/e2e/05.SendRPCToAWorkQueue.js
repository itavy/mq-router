'use strict';

const tap = require('tap');
const { MQRouter } = require('../../lib/latest');
const {
  Fixtures: {
    mqUri: mqURI,
    testConsumerQueue,
  },
} = require('./Fixtures');

tap.test('Send RPC- work queue', (t) => {
  t.plan(2);
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

  const testRequest = Buffer.from('Testing request');
  const testResponse = Buffer.from('Testing response');

  // eslint-disable-next-line require-jsdoc
  const handler = async ({ message }) => {
    const rez = testRequest.compare(message);
    t.equal(rez, 0);
    return { message: testResponse };
  };

  // eslint-disable-next-line require-jsdoc
  const senderHandler = async ({ message }) => {
    const rez = testResponse.compare(message);
    t.equal(rez, 0);
  };

  rcv.subscribe({
    queue: testConsumerQueue,
    handler,
  })
    .then(() => s.sendRequest({
      message:     testRequest,
      destination: {
        queue: testConsumerQueue,
      },
    }))
    .then(senderHandler);
});
