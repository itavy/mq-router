'use strict';

const debug = require('debug')('itavy:MQRouter');
const { EventEmitter } = require('events');
const { IError } = require('@itavy/ierror');
const { RequestsRoutingTable } = require('./RequestsRoutingTable');
const { QueuesRoutingTable } = require('./QueuesRoutingTable');
const connectorsLib = require('@itavy/mq-connector');
const { MQMessage, MQMessageV1 } = require('@itavy/mq-structure');
const {
  getDiffFromStartTime,
} = require('./Helpers');

/**
 * @typedef {Object} MQPublishOptions
 * @property {Number} ttl ttl in seconds for the message
 */
/**
 * Class MQRouter
 */
class MQRouter {
  /**
   * @param {String} mqURI uri for connecting to mq bus
   * @param {String} [connector=RABBIT_MQ] connector type to use
   * @param {Object} mqMessage message builder
   * @param {Object[]} mqKnownMessages list of known message versions
   * @param {Object} mqDefaultMessageVersion default version of message to use
   * @param {String} name router identifier
   * @param {String} [queue=''] own queue on which the router will listen
   * @param {String} [topic=''] own topic on which the router will listen
   * @param {String} [exchange=''] exchange to bind the topic
   * @param {Function} [errorCollector] function to be called when unknown messages are received
   * @param {Function} [defaultHandler] function which resolves to a promise to be called
   * when it receives specific messages
   * @param {Number} [defaultTTL=5] default ttl in seconds for messages or requests sent
   */
  constructor({
    name,
    queue = '',
    mqURI,
    topic = '',
    exchange = '',
    type = connectorsLib.types.RABBIT_MQ,
    mqMessage = MQMessage,
    mqKnownMessages = [MQMessageV1],
    mqDefaultMessageVersion = MQMessageV1,
    errorCollector = null,
    defaultHandler = null,
    defaultTTL = 5,
  }) {
    this.connector = connectorsLib.getConnector(type, { mqURI });

    this.mqMessage = mqMessage;
    this.mqKnownMessages = mqKnownMessages;
    this.mqDefaultMessageVersion = mqDefaultMessageVersion;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;

    this.requestsRoutingTable = Reflect.construct(RequestsRoutingTable, [{ name }]);
    this.requestsRoutingTable.setMessagesTimeoutListener({
      emitter: this.mqrEvents,
    });

    this.queuesRoutingTable = Reflect.construct(QueuesRoutingTable, [{ name }]);

    this.mqRequestIds = [];
    this.defaultTTL = defaultTTL;

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

    if (queue.length === 0) {
      this.identification.listen.queue = `${name}-${getDiffFromStartTime(this.identification.startTime)}`;
    }

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
   * @param {Object} version version of message to be sent
   * @param {String} queue queue or topic where to send the message
   * @param {String} exchange exchange to be used along with queue/topic to send the message,
   * empty string means the default exchange will be used
   * @param {MQPublishOptions} [options={}] options for sending message
   * @returns {Promise} resolves when the message is accepted by the broker
   * @public
   */
  async sendMessage({
    message,
    destination: {
      queue,
      exchange = '',
    },
    options = {},
    version = this.mqDefaultMessageVersion,
  }) {
    try {
      return await this.sendMQMsg({
        message,
        destination: {
          queue,
          exchange,
        },
        options,
        version,
        isRequest: false,
      });
    } catch (cause) {
      debug(`error sending message - ${cause.message}`);
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_SEND_MESSAGE_ERROR',
        source: `${this.sourceIdentifier}.sendMessage`,
        cause,
      }]);
    }
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {String} queue queue or topic where to send the message
   * @param {String} exchange exchange to be used along with queue/topic to send the message,
   * empty string means the default exchange will be used
   * @param {MQPublishOptions} [options={}] options for sending request
   * @param {Object} version version of message to be sent
   * @returns {Promise} resolves when the message is received
   * @public
   */
  async sendRequest({
    message,
    destination: {
      queue,
      exchange = '',
    },
    options = {},
    version = this.mqDefaultMessageVersion,
  }) {
    try {
      await this.checkIfIsSelfSubscribedForResponses();
      return await this.sendMQMsg({
        message,
        destination: {
          queue,
          exchange,
        },
        options,
        version,
        isRequest: true,
      });
    } catch (cause) {
      debug(`error sending request - ${cause.message}`);
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_SEND_REQUEST_ERROR',
        source: `${this.sourceIdentifier}.sendRequest`,
        cause,
      }]);
    }
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
  async subscribe({
    handler,
    queue = '',
    topic = '',
    exchange = '',
    options: {
      prefetch = 0,
      autoDelete = true,
      exclusive = false,
      durable = false,
    } = {},
  }) {
    let index = null;
    try {
      ({ index } = this.queuesRoutingTable.register({
        handler,
        queue,
        exchange,
        topic,
      }));
      const { queue: registeredQueue, consumerTag } = await this.connector.subscribe({
        // this call will be covered in e2e tests
        consumer: /* istanbul ignore next */ (...args) => this.consumeMessages(...args),
        queue,
        topic,
        exchange,
        options:  {
          prefetch,
          autoDelete,
          exclusive,
          durable,
        },
      });
      this.queuesRoutingTable.update({
        queue: registeredQueue,
        index,
        consumerTag,
      });
      return {
        queue: registeredQueue,
        topic,
        exchange,
      };
    } catch (cause) {
      debug(`error subscribing - ${cause.message}`);
      this.queuesRoutingTable.unregister({ index });
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_SUBSCRIBE',
        source: `${this.sourceIdentifier}.subscribe`,
        cause,
      }]);
    }
  }

  /**
   * Unsubscribe from a queue
   * @param {String} queue queue name
   * @param {String} topic topic name
   * @param {String} exchange exchange name
   * @returns {Boolean} returns true if unsubscribed
   * @public
   */
  async unsubscribe({
    queue,
    topic,
    exchange,
  }) {
    const { consumerTag, index } = this.queuesRoutingTable.getHandlerRefsByProperties({
      queue,
      topic,
      exchange,
    });
    try {
      if (consumerTag && index) {
        await this.connector.unsubscribe({ consumerTag });
        this.queuesRoutingTable.unregister({ index });
        return true;
      }
      return false;
    } catch (cause) {
      debug(`error unsubscribing - ${cause.message}`);
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_UNSUBSCRIBE',
        source: `${this.sourceIdentifier}.unsubscribe`,
        cause,
      }]);
    }
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @param {Object} version version of response message
   * @param {String} replyTo reply message id for which is sending message
   * @param {Object} options options to send mq message
   * @param {Boolean} [isRequest=false] if tor this message is expected a response or not
   * @returns {Promise} resolves when the message is received
   * @private
   */
  async sendMQMsg({
    message,
    destination,
    version,
    replyTo = '',
    options = {},
    isRequest = false,
  }) {
    await this.validateDestination(destination);
    const { message: serializedMessage, id } = await this.buildRequest({
      message,
      version,
      replyTo,
    });
    const lOptions = {
      ttl: options.ttl || this.defaultTTL,
    };
    let response = true;
    if (isRequest) {
      response = this.requestsRoutingTable.register({
        options: lOptions,
        id,
      });
    }
    try {
      await this.connector.sendMessage({
        ...destination,
        message: serializedMessage,
        options: lOptions,
      });
    } catch (error) {
      if (response === true) {
        throw error;
      }
      this.requestsRoutingTable.callById({
        id,
        error,
      });
    }
    return response;
  }

  /**
   * internal handler for router
   * @param {MQMessage} message mq messages received
   * @param {String} message.replyTo message id for which to reply
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @returns {Promise} resolves on success
   * @private
   */
  ownHandler({
    replyTo = '',
    message,
    queue,
    topic,
    exchange,
  }) {
    if (replyTo === '') {
      return this.defaultMessageConsumer({
        message,
        queue,
        topic,
        exchange,
      });
    }
    return this.requestsRoutingTable.callById({
      id:      replyTo,
      message: {
        message,
        queue,
        topic,
        exchange,
      },
    });
  }

  /**
   * Wait for self subscribing
   * @returns {Promise} resolves on success subscribing
   * @private
   */
  async waitForSelfSubscription() {
    return new Promise((resolve, reject) => {
      this.mqrEvents.once('selfSubscribed', ({ error }) => {
        if (error) {
          return reject(error);
        }
        return resolve(true);
      });
    });
  }

  /**
   * Check if router has its own queue or it will make first subscription
   * @returns {Promise} resolves when is subscribed
   * @private
   */
  async checkIfIsSelfSubscribedForResponses() {
    if (this.identification.subscribed) {
      return true;
    }
    if (this.identification.subscribing) {
      return this.waitForSelfSubscription();
    }
    this.identification.subscribing = true;
    try {
      const { topic, queue } = await this.subscribe({
        // this call will be covered in e2e tests
        handler:  /* istanbul ignore next */ (...args) => this.ownHandler(...args),
        queue:    this.identification.listen.queue,
        topic:    this.identification.listen.topic,
        exchange: this.identification.listen.exchange,
        options:  {
          prefetch:  0,
          exclusive: true,
        },
      });
      if (topic && topic !== '') {
        this.returnDestination.queue = topic;
      } else {
        this.returnDestination.queue = queue;
      }
      this.identification.subscribed = true;
      this.mqrEvents.emit('selfSubscribed', { error: null });
      this.identification.subscribing = false;
      return true;
    } catch (cause) {
      this.identification.subscribing = false;
      debug(`Error self subscribing: ${cause.message}`);
      const error = Reflect.construct(IError, [{
        name:   'MQ_ROUTER_SELF_SUBSCRIBE',
        source: `${this.sourceIdentifier}.checkIfIsSelfSubscribedForResponses`,
        cause,
      }]);
      this.mqrEvents.emit('selfSubscribed', { error });
      throw error;
    }
  }

  /**
   * Route received message
   * @param {MQMessage} message received mq message
   * @param {String} message.id original message id
   * @param {String} consumerTag consumer tag for receiver
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @param {Object} version version of message to be respond to
   * @returns {Promise} resolves on success
   * @private
   */
  async routeMessage({
    message,
    consumerTag,
    queue,
    topic,
    exchange,
    version,
  } = {}) {
    try {
      const { handler } = await this.queuesRoutingTable.getHandlerByConsumerTag({ consumerTag });
      const { message: responseMessage } = await handler({
        message: message.message,
        replyTo: message.replyTo,
        queue,
        topic,
        exchange,
        consumerTag,
      });
      return this.respondToRequest({
        message:     responseMessage,
        replyTo:     message.id,
        destination: message.replyOn,
        version,
      });
    } catch (cause) {
      debug(`Error routing message - ${cause.message}`);
      const error = Reflect.construct(IError, [{
        name:   'MQ_ROUTER_ROUTING_ERROR',
        source: `${this.sourceIdentifier}.routeMessage`,
        cause,
      }]);
      this.mqrEvents.emit('error', {
        error,
        message,
        queue,
        topic,
        exchange,
        consumerTag,
      });
      throw error;
    }
  }

  /**
   * internal consumer
   * @param {Buffer} message mq message,
   * needs to be unserialized before sending to original consumer
   * @param {String} queue queue
   * @param {String} topic topic
   * @param {String} exchange exchange
   * @param {String} consumerTag consumer tag for the queue on which message arrived
   * @returns {Promise} consume received message
   * @private
   */
  async consumeMessages({
    message,
    queue,
    topic,
    exchange,
    consumerTag,
  }) {
    try {
      const unserializedMessage = await this.mqMessage.from(message);
      const version = this.mqKnownMessages.find(el => unserializedMessage instanceof el);
      if (version) {
        return this.routeMessage({
          message: unserializedMessage,
          queue,
          topic,
          exchange,
          consumerTag,
          version,
        });
      }
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_UNKNOWN_MESSAGE_TYPE',
        source: `${this.sourceIdentifier}.consumeMessages`,
        extra:  {
          unserializedMessage,
        },
      }]);
    } catch (cause) {
      debug(`Error consuming message - ${cause.message}`);
      const error = Reflect.construct(IError, [{
        name:   'MQ_ROUTER_CONSUME_ERROR',
        source: `${this.sourceIdentifier}.consumeMessages`,
        cause,
      }]);
      this.mqrEvents.emit('error', {
        error,
        message,
        queue,
        topic,
        exchange,
        consumerTag,
      });
      throw error;
    }
  }

  /**
   * Send response over mq
   * @param {Buffer|null} message response message to be sent
   * @param {String} replyTo message id for which respond
   * @param {Object} destination where to send response
   * @param {Object} version version of message to build
   * @returns {Promise} resolves if succed to send message
   * @private
   */
  async respondToRequest({
    message,
    replyTo,
    destination,
    version,
  }) {
    if (message === null) {
      return true;
    }
    return this.sendMQMsg({
      isRequest: false,
      message,
      destination,
      replyTo,
      version,
    });
  }

  /**
   * Default message consumer for direct messages
   * @param {MQMessage} message mq messages received
   * @param {String} message.id original message id
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @returns {Promise} resolves when it finishes
   * @private
   */
  async defaultMessageConsumer({
    message,
    queue,
    topic,
    exchange,
  }) {
    if (this.defaultHandler) {
      const { message: responseMessage } =
        await this.defaultHandler.apply(this.defaultHandler, [{
          message: message.message,
          queue,
          topic,
          exchange,
        }]);
      // if consumer fails to send expected response it is a programming error
      // and it should crash program so it can be early corrected
      await this.respondToRequest({
        message:     responseMessage,
        replyTo:     message.id,
        destination: message.replyOn,
      });
      return true;
    }
    const error = Reflect.construct(IError, [{
      name:   'MQ_ROUTER_OWN_HANDLER',
      source: `${this.sourceIdentifier}.ownHandler`,
    }]);
    this.mqrEvents.emit('error', {
      error,
      message,
      queue,
      topic,
      exchange,
    });
    throw error;
  }

  /**
   * Create a message to be sent over MQ
   * @param {Buffer} message message to be sent
   * @param {Object} version version of response message
   * @param {String} [replyTo=''] id of the request message
   * @param {String} [to=''] to who the message is addressed
   * @returns {Promise} resolves with serialized message and the id of th message
   * @private
   */
  async buildRequest({
    message,
    version,
    replyTo = '',
    to = '',
  }) {
    if (!(message instanceof Buffer)) {
      debug('message is not a buffer');
      throw Reflect.construct(IError, [{
        name:   'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER',
        source: `${this.sourceIdentifier}.buildRequest`,
      }]);
    }
    const id = this.getMessageId();
    const serializedMessage = (await this.mqMessage.from({
      id,
      replyTo,
      replyOn: this.returnDestination,
      from:    this.identification.name,
      to,
      message,
    }, version)).toPB();

    return {
      message: serializedMessage,
      id,
    };
  }

  /**
   * Genereate unique message id for this router
   * @returns {String} unique message id
   * @private
   */
  getMessageId() {
    return `${this.identification.name}.${getDiffFromStartTime(this.identification.startTime)}`;
  }

  /**
   * Validate message destination
   * @param {Object} destination where to send the message
   * @returns {Promise} resolves on success
   * @private
   */
  async validateDestination({ queue } = {}) {
    if (queue && (queue.length !== 0)) {
      return true;
    }
    throw Reflect.construct(IError, [{
      name:   'MQ_ROUTER_VALIDATE_DESTINATION',
      source: `${this.sourceIdentifier}.validateDestination`,
    }]);
  }

  /**
   * Close stops checks for expired messages and close connection
   * @returns {Promise} resolves when connection is closed
   * @public
   */
  async close() {
    await this.connector.close();
    return this.requestsRoutingTable.close();
  }
}

module.exports = {
  MQRouter,
};
