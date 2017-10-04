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
   * @param {Number} [defaultTTL=5] default ttl in seconds for messages or requests sent
   * @param {Number} [checkInterval=200] check interval in ms to see if requests have passed
   * their ttl
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
    defaultTTL = 5,
    checkInterval = 200,
  }) {
    this.connector = connector;
    this.mqStructure = mqStructure;

    this.serializer = serializer;
    this.errorBuilder = errorBuilder;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;

    this.mqRequestIds = [];
    this.defaultTTL = defaultTTL * 1000;

    this.identification = {
      startTime: process.hrtime(),
      listen:    {
        queue,
        topic,
        exchange,
      },
      name,
    };

    this.checkIntervalId = setInterval(this.checkRequestsQueue, checkInterval);
  }

  /**
   * Send request over mq
   * @param {Buffer} message message to be sent
   * @param {Object} destination where to send the message
   * @param {Object} options options to send mq message
   * @returns {Promise} resolves when the message is received
   */
  sendRequest({
    message,
    destination,
    options = {},
  }) {
    return new Promise((resolve, reject) => {
      this.validateDestination()
        .then(() => this.buildRequest({
          message,
          destination,
        }))
        .then(({ message: serializedMessage, id }) => {
          this.mqRequestIds.push({
            ts:  Date.now(),
            ttl: (options.ttl * 1000) || this.defaultTTL,
            id,
          });
          this.mqrEvents.once(`${id}`, ({ error, response }) => {
            if (error) {
              return reject(error);
            }
            return resolve(response);
          });

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
    return Promise.reject(Reflect.construct(this.errorBuilder, [{
      name:   'MQ_ROUTER_VALIDATE_DESTINATION',
      source: `${this.sourceIdentifier}.validateDestination`,
    }]));
  }

  /**
   * Check requests for expire
   * @returns {undefined}
   */
  checkRequestsQueue() {
    if (this.mqRequestIds.length !== 0) {
      const currentTime = Date.now();
      const timeoutError = Reflect.construct(this.errorBuilder, [{
        name:   'MQ_ROUTER_MESSAGE_TIMEOUT',
        source: `${this.sourceIdentifier}.checkRequestsQueue`,
      }]);
      this.mqRequestIds = this.mqRequestIds
        .filter((el) => {
          if (currentTime - el.ts >= el.ttl) {
            this.mqrEvents.emit(`${el.id}`, { error: timeoutError });
            return false;
          }
          return true;
        });
    }
  }
}

module.exports = {
  MQRouter,
};
