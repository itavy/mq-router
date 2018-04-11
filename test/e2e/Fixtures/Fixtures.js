'use strict';

const mqUri = 'amqp://mqconnuser:mqconnpwd@localhost/test-mq-router';
const mqExchange = 'test-exchange1';

const testConsumerQueue = 'test-consumer-queue';

const testResponseQueue = 'test-sender-response-queue';

module.exports = {
  mqUri,
  mqExchange,
  testConsumerQueue,
  testResponseQueue,
};
