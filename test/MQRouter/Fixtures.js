'use strict';

const { MQMessage, MQMessageV1 } = require('@itavy/mq-structure');
const { randomId, randomNumber } = require('@itavy/test-utilities');

const bufferedMessageConsumer = Buffer.from(randomId(randomNumber(100, 80)));
const testingMessage = {
  id:      randomId(randomNumber(50, 30)),
  replyTo: randomId(randomNumber(50, 30)),
  from:    randomId(randomNumber(30, 20)),
  replyOn: {
    queue:    randomId(randomNumber(30, 20)),
    exchange: randomId(randomNumber(30, 20)),
  },
  to:      randomId(randomNumber(30, 20)),
  message: bufferedMessageConsumer,
};

const bufferedTestingMessage = MQMessage.fromSync(testingMessage).toPB();

const queue = randomId(randomNumber(30, 20));
const mqURI = 'amqp://localhost';
const name = randomId(randomNumber(30, 20));
const topic = `${randomId(randomNumber(10, 5))}.${randomId(randomNumber(10, 5))}`;
const exchange = randomId(randomNumber(30, 20));

const testingError = Error('MQRouterTestingError');
const routeMessage = {
  message:     testingMessage,
  consumerTag: randomId(randomNumber(30, 20)),
  version:     MQMessageV1,
  queue,
  topic,
  exchange,
};

module.exports = {
  queue,
  topic,
  exchange,
  mqURI,
  name,
  testingError,
  testingMessage,
  bufferedMessageConsumer,
  bufferedTestingMessage,
  routeMessage,
};
