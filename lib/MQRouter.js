'use strict';

const debug = require('debug')('itavy:MQRouter');
const EventEmitter = require('events');

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
   */
  constructor({
    connector,
    mqStructure,
    errorBuilder,
    name,
    serializer,
  }) {
    this.connector = connector;
    this.mqStructure = mqStructure;

    this.serializer = serializer;
    this.errorBuilder = errorBuilder;
    this.mqrEvents = Reflect.construct(EventEmitter, []);
    this.sourceIdentifier = `${name}.MQRouter`;
    this.identification = {
      startTime: process.hrtime(),
      name,
    };
  }

  /*
  sendRequest({ message, destination }) {
    return new Promise((resolve, reject) => {
      // this.buid
    });
  }
  */

  /**
   * Create a message to be sent over MQ
   * @param {Buffer} message message to be sent
   * @param {String} [replyId=''] id of the request message
   * @param {Object} destination where the message is sent
   * @returns {Promise} resolves with serialized message and the id of th message
   */
  buildRequest({ message, destination, replyId = '' }) {
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
        replyOn: {
          queue:    '',
          topic:    '',
          exchange: '',
        },
        from: this.identification.name,
        to:   destination,
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
   */
  getMessageId() {
    const diff = process.hrtime(this.identification.startTime);
    return `${this.identification.name}.${(diff[0] * 1e9) + diff[1]}`;
  }
}

module.exports = {
  MQRouter,
};
