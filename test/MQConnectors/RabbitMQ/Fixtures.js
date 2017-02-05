'use strict';

const moduleName = 'rabbitMqTestingModule';

const mqConnUri = 'amqp://user:pass@host:port/vhost?heartbeat=30';

const createConfirmChannel = () => Promise.resolve({ // eslint-disable-line require-jsdoc
  prefetch:       () => null,
  assertExchange: () => null,
  publish:        () => null,
  consume:        () => null,
});

const mqLib = {
  connect: uri => Promise.resolve({ // eslint-disable-line no-unused-vars
    createConfirmChannel,
  }),
};

const exchangeName = 'rabbitMqExchangeName';
const exchangeOptions = {
  durable:    true,
  autoDelete: true,
};

const publishTTL = 5000;

module.exports = {
  mqConnUri,
  mqLib,
  exchangeName,
  exchangeOptions,
  publishTTL,
  moduleName,
};
