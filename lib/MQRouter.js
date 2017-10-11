'use strict';

const debug = require('debug')('itavy:MQRouter');
const EventEmitter = require('events');
const { has, rejectWithError } = require('./Helpers');

/**
 * Class MQRouter
 */
class MQRouter {
  /**
   * @param {Object} connector mq connector
   * @param {Object} mqStructure mq structure message builder
   * @param {Object} serializer mq structure serializer
   * @param {String} name router identifier
   * @param {MQRequestsRoutingTable} requestsRoutingTable routing table for requests
   * @param {MQQueuesRoutingTable} queuesRoutingTable routing table for requests
   * @param {String} [queue=''] own queue on which the router will listen
   * @param {String} [topic=''] own topic on which the router will listen
   * @param {String} [exchange=''] exchange to bind the topic
   * @param {Function} [errorCollector] function to be called when unknown messages are received
   * @param {Function} [defaultHandler] function which resolves to a promise to be called
   * when it receives specific messages
   * @param {Number} [defaultTTL=5] default ttl in seconds for messages or requests sent
   */
  constructor({
    connector,
    mqStructure,
    name,
    serializer,
    requestsRoutingTable,
    queuesRoutingTable,
    queue,
    topic,
    exchange,
    errorCollector = null,
    defaultHandler = null,
    defaultTTL = 5,
  }) {
    this.connector = connector;
    this.mqStructure = mqStructure;

    this.serializer = serializer;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;

    this.requestsRoutingTable = requestsRoutingTable;
    this.requestsRoutingTable.setMessagesTimeoutListener({
      emitter: this.mqrEvents,
    });

    this.queuesRoutingTable = queuesRoutingTable;

    this.mqRequestIds = [];
    this.defaultTTL = defaultTTL * 1000;

    this.defaultHandler = defaultHandler;

    this.identification = {
      startTime: process.hrtime(),
      listen:    {
        queue,
        topic,
        exchange,
      },
      subscribed:  false,
      subscribing: false,
      name,
    };

    this.returnDestination = {
      queue: null,
      exchange,
    };

    this.mqrEvents.on('error', (...args) => {
      if (errorCollector instanceof Function) {
        errorCollector.apply(errorCollector, args);
      }
    });

    this.mqrEvents.on('defaultMessageConsumer', this.defaultMessageConsumer);
  }

  /**
   * Send message over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @returns {Promise} resolves when the message is accepted by the broker
   */
  sendMessage({
    message,
    destination,
    options = {},
  }) {
    return this.sendMQMsg({
      message,
      destination,
      options,
      isRequest: false,
    })
      .catch((error) => {
        debug(`error sending message - ${error.message}`);
        return rejectWithError({
          name:   'MQ_ROUTER_SEND_MESSAGE_ERROR',
          source: `${this.sourceIdentifier}.sendMessage`,
          cause:  error,
        });
      });
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @returns {Promise} resolves when the message is received
   * @public
   */
  sendRequest({
    message,
    destination,
    options = {},
  }) {
    return this.checkIfIsSelfSubscribedForResponses()
      .then(() => this.sendMQMsg({
        message,
        destination,
        options,
        isRequest: true,
      }))
      .catch((error) => {
        debug(`error sending request - ${error.message}`);
        return rejectWithError({
          name:   'MQ_ROUTER_SEND_REQUEST_ERROR',
          source: `${this.sourceIdentifier}.sendRequest`,
          cause:  error,
        });
      });
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @param {Boolean} [isRequest=false] if tor this message is expected a response or not
   * @returns {Promise} resolves when the message is received
   * @private
   */
  sendMQMsg({
    message,
    destination,
    options = {},
    isRequest = false,
  }) {
    return new Promise((resolve, reject) => {
      this.validateDestination({ destination })
        .then(() => this.buildRequest({
          message,
          destination,
        }))
        .then(({ message: serializedMessage, id }) => {
          if (isRequest) {
            return this.requestsRoutingTable.register({
              options: {
                ttl: options.ttl || this.defaultTTL,
              },
              serializedMessage,
              id,
              resolve,
              reject,
            });
          }
          return Promise.resolve(serializedMessage);
        })
        .then((serializedMessage) => {
          const mqRequest = Object.assign({}, destination, {
            message: serializedMessage,
            options: {
              ttl: options.ttl || this.defaultTTL,
            },
          });

          return this.connector.sendMessage(mqRequest);
        })
        .then(() => {
          if (isRequest) {
            return null;
          }
          return resolve();
        })

        .catch(error => reject(error));
    })
      .catch((error) => {
        debug(`error sending request - ${error.message}`);
        return rejectWithError({
          name:   'MQ_ROUTER_SEND_MQ_MESSAGE',
          source: `${this.sourceIdentifier}.sendMQMsg`,
          cause:  error,
        });
      });
  }

  /**
   * Subscribe to queue
   * @param {Promise} handler Promise to be called when it is received a message
   * @param {String} [queue=''] queue where to subscribe or '' for autogenerated queue
   * @param {String} [topic=''] topic to bind the queue or '' for none
   * @param {String} [exchange=''] exchange to be used for queue and topic or '' for default
   * @param {Object} [options={}] subscribe options
   * @returns {Promise} resolves on success subscribe
   * @public
   */
  subscribe({
    handler,
    queue = '',
    topic = '',
    exchange = '',
    options = {},
  }) {
    let saveIndex = null;
    this.queuesRoutingTable.register({
      handler,
      queue,
      exchange,
      topic,
    })
      .then(({ index }) => {
        saveIndex = index;
        return this.connector.subscribe({
          consumer: this.consumeMessages,
          queue,
          topic,
          exchange,
          options,
        })
          .then(({ queue: registeredQueue, consumerTag }) => this.queuesRoutingTable.update({
            queue: registeredQueue,
            index,
            consumerTag,
          }))
          .then(({ queue: registeredQueue }) => Promise.resolve({
            queue: registeredQueue,
            topic,
            exchange,
          }));
      })
      .catch((error) => {
        debug(`error subscribing - ${error.message}`);
        return this.queuesRoutingTable.unregister({ index: saveIndex })
          .then(() => rejectWithError({
            name:   'MQ_ROUTER_SUBSCRIBE',
            source: `${this.sourceIdentifier}.subscribe`,
            cause:  error,
          }));
      });
  }

  /**
   * internal handler for router
   * @param {MQMessage} message mq messages received
   * @param {String} message.replyId message id for which to reply
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @returns {Promise} resolves on success
   * @private
   */
  ownHandler({
    message,
    queue,
    topic,
    exchange,
  }) {
    return new Promise((resolve, reject) => {
      if (message.replyId === '') {
        return this.mqrEvents.emit('defaultMessageConsumer', {
          message: message.message,
          queue,
          topic,
          exchange,
          resolve,
          reject,
        });
      }
      return this.requestsRoutingTable.callById({
        id:      message.replyId,
        message: {
          message: message.message,
          queue,
          topic,
          exchange,
        },
      })
        .then(() => resolve())
        .catch(error => reject(error));
    });
  }

  /**
   * Check if router has its own queue or it will make first subscription
   * @returns {Promise} resolves when is subscribed
   * @private
   */
  checkIfIsSelfSubscribedForResponses() {
    if (this.identification.subscribed) {
      return Promise.resolve();
    }
    if (this.identification.subscribing) {
      return new Promise((resolve, reject) => {
        this.mqrEvents.once('selfSubscribed', ({ error }) => {
          if (error) {
            return reject(error);
          }
          return resolve(error);
        });
      });
    }
    this.identification.subscribing = false;
    return this.subscribe({
      handler:  this.ownHandler,
      queue:    this.identification.queue,
      topic:    this.identification.topic,
      exchange: this.identification.exchange,
    })
      .then((subscribeResponse) => {
        if (subscribeResponse.topic === '') {
          this.returnDestination.queue = subscribeResponse.queue;
        } else {
          this.returnDestination.queue = subscribeResponse.topic;
        }
        this.identification.subscribing = false;
        this.mqrEvents.emit('selfSubscribed', { error: null });
        return Promise.resolve(subscribeResponse);
      })
      .catch((error) => {
        this.identification.subscribing = false;
        this.mqrEvents.emit('selfSubscribed', {
          error: {
            name:   'MQ_ROUTER_SELF_SUBSCRIBE',
            source: `${this.sourceIdentifier}.checkIfIsSelfSubscribedForResponses`,
            cause:  error,
          },
        });
        return rejectWithError({
          name:   'MQ_ROUTER_SELF_SUBSCRIBE',
          source: `${this.sourceIdentifier}.checkIfIsSelfSubscribedForResponses`,
          cause:  error,
        });
      });
  }

  /**
   * Route received message
   * @param {MQMessage} message received mq message
   * @param {String} message.id original message id
   * @param {String} consumerTag consumer tag for receiver
   * @param {Promise} nack negative ack for this message
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @returns {Promise} resolves on success
   */
  routeMessage({
    message,
    consumerTag,
    nack,
    queue,
    topic,
    exchange,
  }) {
    return this.queuesRoutingTable.getHandlerByConsumerTag({ consumerTag })
      .then(({ handler }) => handler.apply(handler, {
        message,
        queue,
        topic,
        exchange,
        nack,
        consumerTag,
      }))
      .then(({ message: responseMessage }) => this.respondToRequest({
        message:     responseMessage,
        replyId:     message.id,
        destination: message.replyOn,
      }))
      .catch((error) => {
        debug(`Error routing message - ${error.message}`);
        this.mqrEvents.emit('error', {
          error: {
            name:   'MQ_ROUTER_ROUTING_ERROR',
            source: `${this.sourceIdentifier}.routeMessage`,
            cause:  error,
          },
          message,
          queue,
          topic,
          exchange,
        });
        return rejectWithError({
          name:   'MQ_ROUTER_ROUTING_ERROR',
          source: `${this.sourceIdentifier}.routeMessage`,
          cause:  error,
        });
      });
  }

  /**
   * internal consumer
   * @param {Buffer} message mq message,
   * needs to be unserialized before sending to original consumer
   * @param {String} queue queue
   * @param {String} topic topic
   * @param {String} exchange exchange
   * @param {Promise} nack it will resolve on negative ack message
   * @param {String} consumerTag consumer tag for the queue on which message arrived
   * @returns {Promise} consume received message
   * @private
   */
  consumeMessages({
    message,
    queue,
    topic,
    exchange,
    consumerTag,
    nack,
  }) {
    return this.serializer.unserialize(message)
      .then(unserializedMessage => this.routeMessage({
        message: unserializedMessage,
        nack,
        queue,
        topic,
        exchange,
        consumerTag,
      }))
      .catch((error) => {
        debug(`Error consuming message - ${error.message}`);
        this.mqrEvents.emit('error', {
          error: {
            name:   'MQ_ROUTER_CONSUME_ERROR',
            source: `${this.sourceIdentifier}.consumeMessages`,
            cause:  error,
          },
          message,
          queue,
          topic,
          exchange,
        });
        return rejectWithError({
          name:   'MQ_ROUTER_CONSUME_ERROR',
          source: `${this.sourceIdentifier}.consumeMessages`,
          cause:  error,
        });
      });
  }

  /**
   * Send response over mq
   * @param {Buffer|null} message response message to be sent
   * @param {String} replyId message id for which respond
   * @param {Object} destination where to send response
   * @returns {Promise} resolves if succed to send message
   * @private
   */
  respondToRequest({ message, replyId, destination }) {
    if (message === null) {
      return Promise.resolve();
    }
    return this.sendMQMsg({
      message,
      destination,
      replyId,
      isRequest: false,
    });
  }

  /**
   * Default message consumer for direct messages
   * @param {MQMessage} message mq messages received
   * @param {String} message.id original message id
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @param {Function} resolve resolver for this request
   * @param {Function} reject reject the promise for this request
   * @returns {Promise} resolves when it finishes
   * @private
   */
  defaultMessageConsumer({
    message,
    queue,
    topic,
    exchange,
    resolve,
    reject,
  }) {
    if (this.defaultHandler) {
      return this.defaultHandler.apply(this.defaultHandler, {
        message: message.message,
        queue,
        topic,
        exchange,
      })
        // if consumer fails to send expected response it is a programming error
        // and it should crash program so it can be early corrected
        .then(({ message: responseMessage }) => this.respondToRequest({
          message:     responseMessage,
          replyId:     message.id,
          destination: message.replyOn,
        }))
        .then(() => resolve())
        .catch(error => reject(error));
    }
    this.mqrEvents.emit('error', {
      error: {
        name:   'MQ_ROUTER_OWN_HANDLER',
        source: `${this.sourceIdentifier}.ownHandler`,
      },
      message,
      queue,
      topic,
      exchange,
    });
    return reject();
  }

  /**
   * Create a message to be sent over MQ
   * @param {Buffer} message message to be sent
   * @param {String} [replyId=''] id of the request message
   * @param {String} [to=''] to who the message is addressed
   * @returns {Promise} resolves with serialized message and the id of th message
   * @private
   */
  buildRequest({ message, replyId = '', to = '' }) {
    return new Promise((resolve, reject) => {
      // @todo extend check for TypedArray's
      if (!(message instanceof Buffer)) {
        debug('message is not a buffer');
        return rejectWithError({
          name:   'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER',
          source: `${this.sourceIdentifier}.buildRequest`,
        }, reject);
      }
      const m = this.mqStructure({
        id:      this.getMessageId(),
        replyTo: replyId,
        replyOn: this.returnDestination,
        from:    this.identification.name,
        to,
        message,
      });
      return this.serializer.serialize(m)
        .then((serializedMessage => resolve({
          message: serializedMessage,
          id:      m.id,
        })));
    })
      .catch((error) => {
        debug(`error building request - ${error.message}`);
        return rejectWithError({
          name:   'MQ_ROUTER_BUILD_REQUEST_ERROR',
          source: `${this.sourceIdentifier}.buildRequest`,
          cause:  error,
        });
      });
  }

  /**
   * Genereate unique message id for this router
   * @returns {String} unique message id
   * @private
   */
  getMessageId() {
    const diff = process.hrtime(this.identification.startTime);
    return `${this.identification.name}.${(diff[0] * 1e9) + diff[1]}`;
  }

  /**
   * Validate message destination
   * @param {Object} destination where to send the message
   * @returns {Promise} resolves on success
   * @private
   */
  validateDestination({ destination }) {
    if (has(destination, 'queue')) {
      if (destination.queue.length !== 0) {
        return Promise.resolve();
      }
    }
    return rejectWithError({
      name:   'MQ_ROUTER_VALIDATE_DESTINATION',
      source: `${this.sourceIdentifier}.validateDestination`,
    });
  }
}

module.exports = {
  MQRouter,
};
