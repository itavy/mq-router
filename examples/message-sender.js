'use strict';

const { log } = require('./Helpers');
const {
  Fixtures: {
    mqUri: mqURI,
  },
} = require('../test/e2e/Fixtures');
const { MQRouter } = require('../lib/latest/index');

const s = new MQRouter({
  name: 'sender',
  mqURI,
});

s.sendMessage({
  message:     Buffer.from('test message'),
  destination: {
    queue: 'test-io',
  },
})
  .then(r => log(r))
  .catch(e => log(e.cause));

