'use strict';

const mqConnURI = 'amqp://guest:guest@localhost/';

const exchangeName = 'test-exchange';

const exchangeOptions = {
  durable:    true,
  autoDelete: false,
  internal:   false,
};

const publishTTL = 5000;

const ownPrivateRoutingKey = 'itavy.test.privateRoutingKey';

const ownPrivateQueue = 'itavy-test-private-queue';

const ownPrivateQueueOptions = {
  durable:    false,
  autoDelete: true,
  exclusive:  true,
};

const cmdCheckPrivateBinding = {
  command:          `docker exec -i mqrouter-rabbit rabbitmqctl list_bindings destination_name routing_key source_name | grep "${ownPrivateQueue}"`,
  outputColumns:    ['queue', 'pattern', 'sourceName'],
  errorCodeHandler: (error) => {
    if (1 === error.code) {
      return Promise.resolve({
        stderr: '',
        stdout: '',
      });
    }
    return Promise.reject(error);
  },
};
const cmdCheckPrivateQueue = {
  command:          `docker exec -i mqrouter-rabbit rabbitmqctl list_queues name durable exclusive auto_delete | grep "${ownPrivateQueue}"`,
  outputColumns:    ['name', 'durable', 'exclusive', 'autoDelete'],
  errorCodeHandler: (error) => {
    if (1 === error.code) {
      return Promise.resolve({
        stderr: '',
        stdout: '',
      });
    }
    return Promise.reject(error);
  },
};


module.exports = {
  mqConnURI,
  exchangeName,
  exchangeOptions,
  publishTTL,
  ownPrivateQueue,
  ownPrivateQueueOptions,
  ownPrivateRoutingKey,
  cmdCheckPrivateBinding,
  cmdCheckPrivateQueue,
};
