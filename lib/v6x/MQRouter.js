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

var _require5 = require('@itavy/mq-connector');

const getConnector = _require5.getConnector,
      types = _require5.types;

var _require6 = require('@itavy/mq-structure');

const MQMessage = _require6.MQMessage,
      MQMessageV1 = _require6.MQMessageV1;

var _require7 = require('./Helpers');

const MS_FACTOR = _require7.MS_FACTOR,
      NS_FACTOR = _require7.NS_FACTOR;

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
    queue,
    mqURI,
    topic = '',
    exchange = '',
    type = types.RABBIT_MQ,
    mqMessage = MQMessage,
    mqKnownMessages = [MQMessageV1],
    mqDefaultMessageVersion = MQMessageV1,
    errorCollector = null,
    defaultHandler = null,
    defaultTTL = 5
  }) {
    this.connector = getConnector(type, { mqURI });

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
    this.defaultTTL = defaultTTL * MS_FACTOR;

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
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @returns {Promise} resolves when the message is accepted by the broker
   */
  sendMessage({
    message,
    destination,
    options = {},
    version = this.mqDefaultMessageVersion
  }) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        return _this.sendMQMsg({
          message,
          destination,
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
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @param {Object} version version of message to be sent
   * @returns {Promise} resolves when the message is received
   * @public
   */
  sendRequest({
    message,
    destination,
    options = {},
    version = this.mqDefaultMessageVersion
  }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this2.checkIfIsSelfSubscribedForResponses();
        return _this2.sendMQMsg({
          message,
          destination,
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
    version,
    options = {},
    isRequest = false
  }) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      yield _this3.validateDestination({ destination });

      var _ref = yield _this3.buildRequest({
        message,
        destination,
        version
      });

      const serializedMessage = _ref.message,
            id = _ref.id;

      const lOptions = {
        ttl: options.ttl || _this3.defaultTTL
      };
      let response = true;
      if (isRequest) {
        response = _this3.requestsRoutingTable.register({
          options: lOptions,
          id
        });
      }
      try {
        yield _this3.connector.sendMessage(Object.assign({}, destination, {
          message: serializedMessage,
          options: lOptions
        }));
      } catch (error) {
        if (response === true) {
          throw error;
        }
        _this3.requestsRoutingTable.callById({
          id,
          error
        });
      }
      return response;
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
    options = {}
  }) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      let index = null;
      try {
        var _queuesRoutingTable$r = _this4.queuesRoutingTable.register({
          handler,
          queue,
          exchange,
          topic
        });

        index = _queuesRoutingTable$r.index;

        var _ref2 = yield _this4.connector.subscribe({
          consumer: _this4.consumeMessages,
          queue,
          topic,
          exchange,
          options
        });

        const registeredQueue = _ref2.queue,
              consumerTag = _ref2.consumerTag;

        _this4.queuesRoutingTable.update({
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
        _this4.queuesRoutingTable.unregister({ index });
        throw Reflect.construct(IError, {
          name: 'MQ_ROUTER_SUBSCRIBE',
          source: `${_this4.sourceIdentifier}.subscribe`,
          cause
        });
      }
    })();
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
    exchange
  }) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      if (message.replyId === '') {
        return _this5.defaultMessageConsumer({
          message: message.message,
          queue,
          topic,
          exchange
        });
      }
      return _this5.requestsRoutingTable.callById({
        id: message.replyId,
        message: {
          message: message.message,
          queue,
          topic,
          exchange
        }
      });
    })();
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
          return resolve(error);
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
      _this7.identification.subscribing = false;
      try {
        var _ref3 = yield _this7.subscribe({
          handler: _this7.ownHandler,
          queue: _this7.identification.queue,
          topic: _this7.identification.topic,
          exchange: _this7.identification.exchange
        });

        const topic = _ref3.topic,
              queue = _ref3.queue;

        if (topic === '') {
          _this7.returnDestination.queue = queue;
        } else {
          _this7.returnDestination.queue = topic;
        }
        _this7.identification.subscribing = false;
        _this7.mqrEvents.emit('selfSubscribed', { error: null });
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
   * @param {Promise} nack negative ack for this message
   * @param {String} queue queue on which the message was received
   * @param {String} topic topic on which the message was received
   * @param {String} exchange exchange on which the message was received
   * @param {Object} version version of message to be respond to
   * @returns {Promise} resolves on success
   */
  routeMessage({
    message,
    consumerTag,
    nack,
    queue,
    topic,
    exchange,
    version
  }) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      try {
        var _ref4 = yield _this8.queuesRoutingTable.getHandlerByConsumerTag({ consumerTag });

        const handler = _ref4.handler;

        var _ref5 = yield handler.apply(handler, {
          message: message.message,
          queue,
          topic,
          exchange,
          nack,
          consumerTag
        });

        const responseMessage = _ref5.message;

        return _this8.respondToRequest({
          message: responseMessage,
          replyId: message.id,
          destination: message.replyOn,
          version
        });
      } catch (cause) {
        debug(`Error routing message - ${cause.message}`);
        const error = Reflect.construct(IError, {
          name: 'MQ_ROUTER_ROUTING_ERROR',
          source: `${_this8.sourceIdentifier}.routeMessage`,
          cause
        });
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
    nack
  }) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      try {
        const unserializedMessage = _this9.mqMessage.from(message);
        const version = _this9.mqKnownMessages.find(function (el) {
          return unserializedMessage instanceof el;
        });
        if (version) {
          return _this9.routeMessage({
            message: unserializedMessage,
            nack,
            queue,
            topic,
            exchange,
            consumerTag,
            version
          });
        }
        throw Reflect.construct(IError, {
          name: 'MQ_ROUTER_UNKNOWN_MESSAGE_TYPE',
          source: `${_this9.sourceIdentifier}.consumeMessages`,
          extra: {
            unserializedMessage
          }
        });
      } catch (cause) {
        debug(`Error consuming message - ${cause.message}`);
        const error = Reflect.construct(IError, {
          name: 'MQ_ROUTER_CONSUME_ERROR',
          source: `${_this9.sourceIdentifier}.consumeMessages`,
          cause
        });
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
   * @param {String} replyId message id for which respond
   * @param {Object} destination where to send response
   * @param {Object} version version of message to build
   * @returns {Promise} resolves if succed to send message
   * @private
   */
  respondToRequest({
    message,
    replyId,
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
        replyId,
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
        var _ref6 = yield _this11.defaultHandler.apply(_this11.defaultHandler, {
          message: message.message,
          queue,
          topic,
          exchange
        });

        const responseMessage = _ref6.message;
        // if consumer fails to send expected response it is a programming error
        // and it should crash program so it can be early corrected

        yield _this11.respondToRequest({
          message: responseMessage,
          replyId: message.id,
          destination: message.replyOn
        });
        return true;
      }
      const error = Reflect.construct(IError, {
        name: 'MQ_ROUTER_OWN_HANDLER',
        source: `${_this11.sourceIdentifier}.ownHandler`
      });
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
   * @param {String} [replyId=''] id of the request message
   * @param {String} [to=''] to who the message is addressed
   * @returns {Promise} resolves with serialized message and the id of th message
   * @private
   */
  buildRequest({
    message,
    version,
    replyId = '',
    to = ''
  }) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      if (!(message instanceof Buffer)) {
        debug('message is not a buffer');
        throw Reflect.construct(IError, {
          name: 'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER',
          source: `${_this12.sourceIdentifier}.buildRequest`
        });
      }
      const id = _this12.getMessageId();
      const serializedMessage = _this12.mqMessage.from({
        id,
        replyTo: replyId,
        replyOn: _this12.returnDestination,
        from: _this12.identification.name,
        to,
        message
      }, version).toPB();

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
    const diff = process.hrtime(this.identification.startTime);
    return `${this.identification.name}.${diff[0] * NS_FACTOR + diff[1]}`;
  }

  /**
   * Validate message destination
   * @param {Object} destination where to send the message
   * @returns {Promise} resolves on success
   * @private
   */
  validateDestination({ destination } = {}) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      const queue = destination.queue;

      if (queue && queue.length !== 0) {
        return true;
      }
      throw Reflect.construct(IError({
        name: 'MQ_ROUTER_VALIDATE_DESTINATION',
        source: `${_this13.sourceIdentifier}.validateDestination`
      }));
    })();
  }
}

module.exports = {
  MQRouter
};