'use strict';

const moduleName = 'rabbitMqTestingModule';

const mqConnUri = 'amqp://user:pass@host:port/vhost?heartbeat=30';

const subscribedQueue = {
  queue: 'sUbScrIBEDQueUEName',
};

const subscribedRoutingKey = 's.q.routing.key';

const mqChannel = {
  prefetch:       () => Promise.resolve(),
  assertExchange: () => Promise.resolve(),
  assertQueue:    () => Promise.resolve(subscribedQueue),
  bindQueue:      () => Promise.resolve(),
  publish:        () => null,
  consume:        () => null,
};

const mqConnection = {
  createConfirmChannel: () => Promise.resolve(mqChannel), // eslint-disable-line require-jsdoc
};

const mqLib = {
  connect: uri => Promise.resolve(mqConnection), // eslint-disable-line no-unused-vars
};

const exchangeName = 'rabbitMqExchangeName';
const exchangeOptions = {
  durable:    true,
  autoDelete: true,
};

const queueParameters = {
  exclusive:  true,
  durable:    true,
  autoDelete: false,
};

const queueName = 'tEsTiNgQuEuEnAmE';

const publishTTL = 5000;

const genericMqError = Error('testing');

module.exports = {
  mqConnUri,
  mqChannel,
  mqConnection,
  mqLib,
  exchangeName,
  exchangeOptions,
  publishTTL,
  moduleName,
  genericMqError,
  queueParameters,
  queueName,
  subscribedQueue,
  subscribedRoutingKey,
};
