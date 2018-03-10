'use strict';

const { log } = require('./Helpers');
const {
  Fixtures: {
    mqUri: mqURI,
  },
} = require('../test/e2e/Fixtures');
const { MQRouter } = require('../lib/latest/index');

const s = new MQRouter({
  name:  'rpc-sender',
  queue: 'rpc-test-response',
  mqURI,
});

const handlerResponse = async ({ message }) => {
  console.log('handler', message.toString());
};

s.sendRequest({
  message:     Buffer.from('test message'),
  destination: {
    queue: 'test-io',
  },
})
  .then(handlerResponse)
  .catch(e => log(e.cause));

