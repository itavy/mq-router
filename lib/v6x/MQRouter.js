'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const debug = require('debug')('itavy:MQRouter');

var _require = require('events');

const EventEmitter = _require.EventEmitter;

var _require2 = require('@itavy/ierror');

const IError = _require2.IError;

var _require3 = require('./RequestsRoutingTable');

const RequestsRoutingTable = _require3.RequestsRoutingTable;

var _require4 = require('./QueuesRoutingTable');

const QueuesRoutingTable = _require4.QueuesRoutingTable;

const connectorsLib = require('@itavy/mq-connector');

var _require5 = require('@itavy/mq-structure');

const MQMessage = _require5.MQMessage,
      MQMessageV1 = _require5.MQMessageV1;

var _require6 = require('./Helpers');

const getDiffFromStartTime = _require6.getDiffFromStartTime;

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
    defaultTTL = 5
  }) {
    this.connector = connectorsLib.getConnector(type, { mqURI });

    this.mqMessage = mqMessage;
    this.mqKnownMessages = mqKnownMessages;
    this.mqDefaultMessageVersion = mqDefaultMessageVersion;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;

    this.requestsRoutingTable = Reflect.construct(RequestsRoutingTable, [{ name }]);
    this.requestsRoutingTable.setMessagesTimeoutListener({
      emitter: this.mqrEvents
    });

    this.queuesRoutingTable = Reflect.construct(QueuesRoutingTable, [{ name }]);

    this.mqRequestIds = [];
    this.defaultTTL = defaultTTL;

    this.defaultHandler = defaultHandler;

    this.identification = {
      startTime: process.hrtime(),
      listen: {
        queue,
        topic,
        exchange
      },
      subscribed: false,
      subscribing: false,
      name
    };

    if (queue.length === 0) {
      this.identification.listen.queue = `${name}-${getDiffFromStartTime(this.identification.startTime)}`;
    }

    this.returnDestination = {
      queue: null,
      exchange
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
  sendMessage({
    message,
    destination: {
      queue,
      exchange = ''
    },
    options = {},
    version = this.mqDefaultMessageVersion
  }) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        return yield _this.sendMQMsg({
          message,
          destination: {
            queue,
            exchange
          },
          options,
          version,
          isRequest: false
        });
      } catch (cause) {
        debug(`error sending message - ${cause.message}`);
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_SEND_MESSAGE_ERROR',
          source: `${_this.sourceIdentifier}.sendMessage`,
          cause
        }]);
      }
    })();
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
  sendRequest({
    message,
    destination: {
      queue,
      exchange = ''
    },
    options = {},
    version = this.mqDefaultMessageVersion
  }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this2.checkIfIsSelfSubscribedForResponses();
        return yield _this2.sendMQMsg({
          message,
          destination: {
            queue,
            exchange
          },
          options,
          version,
          isRequest: true
        });
      } catch (cause) {
        debug(`error sending request - ${cause.message}`);
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_SEND_REQUEST_ERROR',
          source: `${_this2.sourceIdentifier}.sendRequest`,
          cause
        }]);
      }
    })();
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
    options: {
      prefetch = 0,
      autoDelete = true,
      exclusive = false,
      durable = false
    } = {}
  }) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let index = null;
      try {
        var _queuesRoutingTable$r = _this3.queuesRoutingTable.register({
          handler,
          queue,
          exchange,
          topic
        });

        index = _queuesRoutingTable$r.index;

        var _ref = yield _this3.connector.subscribe({
          // this call will be covered in e2e tests
          consumer: /* istanbul ignore next */function consumer(...args) {
            return _this3.consumeMessages(...args);
          },
          queue,
          topic,
          exchange,
          options: {
            prefetch,
            autoDelete,
            exclusive,
            durable
          }
        });

        const registeredQueue = _ref.queue,
              consumerTag = _ref.consumerTag;

        _this3.queuesRoutingTable.update({
          queue: registeredQueue,
          index,
          consumerTag
        });
        return {
          queue: registeredQueue,
          topic,
          exchange
        };
      } catch (cause) {
        debug(`error subscribing - ${cause.message}`);
        _this3.queuesRoutingTable.unregister({ index });
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_SUBSCRIBE',
          source: `${_this3.sourceIdentifier}.subscribe`,
          cause
        }]);
      }
    })();
  }

  /**
   * Unsubscribe from a queue
   * @param {Object} mqProps mq subscription properties
   * @returns {Boolean} returns true if unsubscribed
   * @public
   */
  unsubscribe(mqProps) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      let consumerTag = null;
      let index = null;
      try {
        var _queuesRoutingTable$g = _this4.queuesRoutingTable.getHandlerRefsByProperties(mqProps);

        consumerTag = _queuesRoutingTable$g.consumerTag;
        index = _queuesRoutingTable$g.index;

        _this4.queuesRoutingTable.unregister({ index });
        return yield _this4.connector.unsubscribe({ consumerTag });
      } catch (cause) {
        debug(`error unsubscribing - ${cause.message}`);
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_UNSUBSCRIBE',
          source: `${_this4.sourceIdentifier}.unsubscribe`,
          cause
        }]);
      }
    })();
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
  sendMQMsg({
    message,
    destination,
    version,
    replyTo = '',
    options = {},
    isRequest = false
  }) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      yield _this5.validateDestination(destination);

      var _ref2 = yield _this5.buildRequest({
        message,
        version,
        replyTo
      });

      const serializedMessage = _ref2.message,
            id = _ref2.id;

      const lOptions = {
        ttl: options.ttl || _this5.defaultTTL
      };
      let response = true;
      if (isRequest) {
        response = _this5.requestsRoutingTable.register({
          options: lOptions,
          id
        });
      }
      try {
        yield _this5.connector.sendMessage(Object.assign({}, destination, {
          message: serializedMessage,
          options: lOptions
        }));
      } catch (error) {
        if (response === true) {
          throw error;
        }
        _this5.requestsRoutingTable.callById({
          id,
          error
        });
      }
      return response;
    })();
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
    exchange
  }) {
    if (replyTo === '') {
      return this.defaultMessageConsumer({
        message,
        queue,
        topic,
        exchange
      });
    }
    return this.requestsRoutingTable.callById({
      id: replyTo,
      message: {
        message,
        queue,
        topic,
        exchange
      }
    });
  }

  /**
   * Wait for self subscribing
   * @returns {Promise} resolves on success subscribing
   * @private
   */
  waitForSelfSubscription() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      return new Promise(function (resolve, reject) {
        _this6.mqrEvents.once('selfSubscribed', function ({ error }) {
          if (error) {
            return reject(error);
          }
          return resolve(true);
        });
      });
    })();
  }

  /**
   * Check if router has its own queue or it will make first subscription
   * @returns {Promise} resolves when is subscribed
   * @private
   */
  checkIfIsSelfSubscribedForResponses() {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      if (_this7.identification.subscribed) {
        return true;
      }
      if (_this7.identification.subscribing) {
        return _this7.waitForSelfSubscription();
      }
      _this7.identification.subscribing = true;
      try {
        var _ref3 = yield _this7.subscribe({
          // this call will be covered in e2e tests
          handler: /* istanbul ignore next */function handler(...args) {
            return _this7.ownHandler(...args);
          },
          queue: _this7.identification.listen.queue,
          topic: _this7.identification.listen.topic,
          exchange: _this7.identification.listen.exchange,
          options: {
            prefetch: 0,
            exclusive: true
          }
        });

        const topic = _ref3.topic,
              queue = _ref3.queue;

        if (topic && topic !== '') {
          _this7.returnDestination.queue = topic;
        } else {
          _this7.returnDestination.queue = queue;
        }
        _this7.identification.subscribed = true;
        _this7.mqrEvents.emit('selfSubscribed', { error: null });
        _this7.identification.subscribing = false;
        return true;
      } catch (cause) {
        _this7.identification.subscribing = false;
        debug(`Error self subscribing: ${cause.message}`);
        const error = Reflect.construct(IError, [{
          name: 'MQ_ROUTER_SELF_SUBSCRIBE',
          source: `${_this7.sourceIdentifier}.checkIfIsSelfSubscribedForResponses`,
          cause
        }]);
        _this7.mqrEvents.emit('selfSubscribed', { error });
        throw error;
      }
    })();
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
  routeMessage({
    message,
    consumerTag,
    queue,
    topic,
    exchange,
    version
  } = {}) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      try {
        var _ref4 = yield _this8.queuesRoutingTable.getHandlerByConsumerTag({ consumerTag });

        const handler = _ref4.handler;

        var _ref5 = yield handler({
          message: message.message,
          replyTo: message.replyTo,
          queue,
          topic,
          exchange,
          consumerTag
        });

        const responseMessage = _ref5.message;

        return _this8.respondToRequest({
          message: responseMessage,
          replyTo: message.id,
          destination: message.replyOn,
          version
        });
      } catch (cause) {
        debug(`Error routing message - ${cause.message}`);
        const error = Reflect.construct(IError, [{
          name: 'MQ_ROUTER_ROUTING_ERROR',
          source: `${_this8.sourceIdentifier}.routeMessage`,
          cause
        }]);
        _this8.mqrEvents.emit('error', {
          error,
          message,
          queue,
          topic,
          exchange,
          consumerTag
        });
        throw error;
      }
    })();
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
  consumeMessages({
    message,
    queue,
    topic,
    exchange,
    consumerTag
  }) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      try {
        const unserializedMessage = yield _this9.mqMessage.from(message);
        const version = _this9.mqKnownMessages.find(function (el) {
          return unserializedMessage instanceof el;
        });
        if (version) {
          return _this9.routeMessage({
            message: unserializedMessage,
            queue,
            topic,
            exchange,
            consumerTag,
            version
          });
        }
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_UNKNOWN_MESSAGE_TYPE',
          source: `${_this9.sourceIdentifier}.consumeMessages`,
          extra: {
            unserializedMessage
          }
        }]);
      } catch (cause) {
        debug(`Error consuming message - ${cause.message}`);
        const error = Reflect.construct(IError, [{
          name: 'MQ_ROUTER_CONSUME_ERROR',
          source: `${_this9.sourceIdentifier}.consumeMessages`,
          cause
        }]);
        _this9.mqrEvents.emit('error', {
          error,
          message,
          queue,
          topic,
          exchange,
          consumerTag
        });
        throw error;
      }
    })();
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
  respondToRequest({
    message,
    replyTo,
    destination,
    version
  }) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      if (message === null) {
        return true;
      }
      return _this10.sendMQMsg({
        isRequest: false,
        message,
        destination,
        replyTo,
        version
      });
    })();
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
  defaultMessageConsumer({
    message,
    queue,
    topic,
    exchange
  }) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      if (_this11.defaultHandler) {
        var _ref6 = yield _this11.defaultHandler.apply(_this11.defaultHandler, [{
          message: message.message,
          queue,
          topic,
          exchange
        }]);

        const responseMessage = _ref6.message;
        // if consumer fails to send expected response it is a programming error
        // and it should crash program so it can be early corrected

        yield _this11.respondToRequest({
          message: responseMessage,
          replyTo: message.id,
          destination: message.replyOn
        });
        return true;
      }
      const error = Reflect.construct(IError, [{
        name: 'MQ_ROUTER_OWN_HANDLER',
        source: `${_this11.sourceIdentifier}.ownHandler`
      }]);
      _this11.mqrEvents.emit('error', {
        error,
        message,
        queue,
        topic,
        exchange
      });
      throw error;
    })();
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
  buildRequest({
    message,
    version,
    replyTo = '',
    to = ''
  }) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      if (!(message instanceof Buffer)) {
        debug('message is not a buffer');
        throw Reflect.construct(IError, [{
          name: 'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER',
          source: `${_this12.sourceIdentifier}.buildRequest`
        }]);
      }
      const id = _this12.getMessageId();
      const serializedMessage = (yield _this12.mqMessage.from({
        id,
        replyTo,
        replyOn: _this12.returnDestination,
        from: _this12.identification.name,
        to,
        message
      }, version)).toPB();

      return {
        message: serializedMessage,
        id
      };
    })();
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
  validateDestination({ queue } = {}) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      if (queue && queue.length !== 0) {
        return true;
      }
      throw Reflect.construct(IError, [{
        name: 'MQ_ROUTER_VALIDATE_DESTINATION',
        source: `${_this13.sourceIdentifier}.validateDestination`
      }]);
    })();
  }

  /**
   * Close stops checks for expired messages and close connection
   * @returns {Promise} resolves when connection is closed
   * @public
   */
  close() {
    var _this14 = this;

    return _asyncToGenerator(function* () {
      yield _this14.connector.close();
      return _this14.requestsRoutingTable.close();
    })();
  }
}

module.exports = {
  MQRouter
};