'use strict';

const { MQMessage, MQMessageV1 } = require('@itavy/mq-structure');
const { randomId, randomNumber } = require('@itavy/test-utilities');

const bufferedMessageConsumer = Buffer.from(randomId(randomNumber(100, 80)));
const testingResponseMessage = {
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

const testingRequestMessage = {
  id:      randomId(randomNumber(50, 30)),
  replyTo: '',
  from:    randomId(randomNumber(30, 20)),
  replyOn: {
    queue:    randomId(randomNumber(30, 20)),
    exchange: randomId(randomNumber(30, 20)),
  },
  to:      randomId(randomNumber(30, 20)),
  message: bufferedMessageConsumer,
};

const mqTestingResponseMessage = Reflect.construct(MQMessageV1, [testingResponseMessage]);
const bufferedTestingResponseMessage = mqTestingResponseMessage.toPB();

const mqTestingRequestMessage = Reflect.construct(MQMessageV1, [testingRequestMessage]);
const bufferedTestingRequestMessage = mqTestingRequestMessage.toPB();

const queue = randomId(randomNumber(30, 20));
const mqURI = 'amqp://localhost';
const name = randomId(randomNumber(30, 20));
const topic = `${randomId(randomNumber(10, 5))}.${randomId(randomNumber(10, 5))}`;
const exchange = randomId(randomNumber(30, 20));

const testingError = Error('MQRouterTestingError');
const routeMessage = {
  message:     mqTestingResponseMessage,
  consumerTag: randomId(randomNumber(30, 20)),
  version:     MQMessageV1,
  queue,
  topic,
  exchange,
};

const consumeMessage = {
  message:     bufferedTestingResponseMessage,
  consumerTag: randomId(randomNumber(30, 20)),
  queue,
  topic,
  exchange,
};

const sendMQMsgRequestNoTTL = {
  message:     bufferedMessageConsumer,
  destination: {
    queue: randomId(randomNumber(30, 20)),
  },
  version:   MQMessageV1,
  isRequest: true,
};

const sendMQMsgRequest = Object.assign(
  {},
  sendMQMsgRequestNoTTL,
  {
    options: {
      ttl: randomNumber(30, 5),
    },
  }
);

const sendMQMsgResponse = {
  message:     bufferedMessageConsumer,
  destination: {
    queue: randomId(randomNumber(30, 20)),
  },
  version: MQMessageV1,
  replyTo: randomId(randomNumber(30, 20)),
  options: {
    ttl: randomNumber(30, 5),
  },
};

const sendMessageDummy = {
  message:     bufferedMessageConsumer,
  destination: {
    queue: randomId(randomNumber(30, 20)),
  },
};

const sendMessageWithTTL = Object.assign({}, sendMessageDummy, {
  options: {
    ttl: randomNumber(20, 5),
  },
});

const sendMessageWithVersion = Object.assign({}, sendMessageDummy, {
  version: MQMessageV1,
});

module.exports = {
  queue,
  topic,
  exchange,
  mqURI,
  name,
  testingError,
  bufferedMessageConsumer,

  testingResponseMessage,
  mqTestingResponseMessage,
  bufferedTestingResponseMessage,

  testingRequestMessage,
  mqTestingRequestMessage,
  bufferedTestingRequestMessage,

  routeMessage,
  consumeMessage,

  sendMQMsgResponse,
  sendMQMsgRequestNoTTL,
  sendMQMsgRequest,

  sendMessageDummy,
  sendMessageWithTTL,
  sendMessageWithVersion,

  MQMessage,
  MQMessageV1,
};
