'use strict';

const { log } = require('./Helpers');
const {
  Fixtures: {
    mqUri: mqURI,
  },
} = require('../test/e2e/Fixtures');
const { MQRouter } = require('../lib/latest/index');


const rcv = new MQRouter({
  name: 'receiver',
  mqURI,
});

// eslint-disable-next-line require-jsdoc
const handler = async ({ message }) => {
  log('Received', message.toString());
  return { message: null };
};

rcv.subscribe({
  queue: 'test-io',
  handler,
})
  .then(r => log('suscribed', r))
  .catch(e => log('err subscribe', e));
