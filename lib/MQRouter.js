'use strict';

const debug = require('debug')('itavy:MQRouter');
const EventEmitter = require('events');
const { has } = require('./Helpers');

/**
 * Class MQRouter
 */
class MQRouter {
  /**
   * @param {Object} connector mq connector
   * @param {Object} mqStructure mq structure message builder
   * @param {Object} serializer mq structure serializer
   * @param {Object} errorBuilder error builder
   * @param {String} name router identificator
   * @param {String} [queue=''] own queue on which the router will listen
   * @param {String} [topic=''] own topic on which the router will listen
   * @param {String} [exchange=''] exchange to bind the topic
   */
  constructor({
    connector,
    mqStructure,
    errorBuilder,
    name,
    serializer,
    queue,
    topic,
    exchange,
  }) {
    this.connector = connector;
    this.mqStructure = mqStructure;

    this.serializer = serializer;
    this.errorBuilder = errorBuilder;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;

    this.identification = {
      startTime: process.hrtime(),
      listen:    {
        queue,
        topic,
        exchange,
      },
      name,
    };
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @returns {Promise} resolves when the message is received
   */
  sendRequest({ message, destination }) {
    return new Promise((resolve, reject) => {
      this.validateDestination()
        .then(() => this.buildRequest({
          message,
          destination,
        }))
        .catch(error => reject(error));
    })
      .catch((error) => {
        debug(`error sending request - ${error.message}`);
        return Promise.reject(Reflect.construct(this.errorBuilder, [{
          name:   'MQ_ROUTER_SEND_REQUEST_ERROR',
          source: `${this.sourceIdentifier}.sendRequest`,
          cause:  error,
        }]));
      });
  }

  /**
   * Create a message to be sent over MQ
   * @param {Buffer} message message to be sent
   * @param {String} [replyId=''] id of the request message
   * @param {Object} destination where the message is sent
   * @param {String} [to=''] to who the message is addressed
   * @returns {Promise} resolves with serialized message and the id of th message
   * @private
   */
  buildRequest({ message, destination, replyId = '', to = '' }) {
    return new Promise((resolve, reject) => {
      // @todo extend check for TypedArray's
      if (!(message instanceof Buffer)) {
        debug('message is not a buffer');
        return reject(Reflect.construct(this.errorBuilder, [{
          name:   'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER',
          source: `${this.sourceIdentifier}.buildRequest`,
        }]));
      }
      const m = this.mqStructure({
        id:      this.getMessageId(),
        replyTo: replyId,
        replyOn: destination,
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
        return Promise.reject(Reflect.construct(this.errorBuilder, [{
          name:   'MQ_ROUTER_BUILD_REQUEST_ERROR',
          source: `${this.sourceIdentifier}.buildRequest`,
          cause:  error,
        }]));
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
    if (has(destination, 'topic') && has(destination.exchange)) {
      if ((destination.topic.length !== 0) && (destination.exchange.length !== 0)) {
        return Promise.resolve();
      }
    }
    return Promise.reject(Reflect.construct(this.errorBuilder, [{
      name:   'MQ_ROUTER_VALIDATE_DESTINATION',
      source: `${this.sourceIdentifier}.validateDestination`,
    }]));
  }
}

module.exports = {
  MQRouter,
};
