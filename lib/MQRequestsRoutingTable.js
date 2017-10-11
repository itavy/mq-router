'use strict';

const { rejectWithError, IError } = require('./Helpers');

/**
 * MQRequestsRoutingTable class
 */
class MQRequestsRoutingTable {
  /**
   * @param {String} name router name
   * @param {Number} [checkInterval=200] check interval in ms to see if requests have passed
   * their ttl
   */
  constructor({
    name,
    checkInterval,
  }) {
    this.mqrEvents = null;

    this.sourceIdentifier = `${name}.MQRequestsRoutingTable`;
    this.mqRequestIds = [];

    // @todo optimization: set interval only if there are requests pending
    this.checkIntervalId = setInterval(this.checkRequestsQueue, checkInterval);
  }

  /**
   * Register a check for a request
   * @param {Buffer} serializedMessage message to be sent
   * @param {String} id message id
   * @param {Object} options message options
   * @param {Function} resolve promise to be called when it receive a response
   * @param {Function} reject reject to be called when timeout or an error occurs
   * @returns {Promise} resolves with serialized message after register
   * @public
   */
  register({
    serializedMessage,
    id,
    options,
    resolve,
    reject,
  }) {
    this.mqRequestIds.push({
      ts:  Date.now(),
      ttl: options.ttl * 1000,
      id,
    });
    this.mqrEvents.once(`${id}`, ({ error, response }) => {
      if (error) {
        return reject(error);
      }
      return resolve(response);
    });

    return Promise.resolve(serializedMessage);
  }

  /**
   * unregister a resolver
   * @param {String} id message id
   * @returns {Promise} resolves
   * @public
   */
  unregister({ id }) {
    this.mqrEvents.removeAllListeners(`${id}`);
    this.mqRequestIds = this.mqRequestIds
      .filter(el => el.id !== id);
    return Promise.resolve();
  }

  /**
   * Resolve a request
   * @param {String} id message id
   * @param {Buffer} message response message
   * @returns {Promise} resolves with success if the response is waited or rejects otherwise
   * @public
   */
  callById({ id, message }) {
    const listenerExists = this.mqrEvents.emit(`${id}`, {
      error: null,
      message,
    });
    if (listenerExists) {
      this.mqRequestIds = this.mqRequestIds
        .filter(el => el.id !== id);
      return Promise.resolve();
    }
    return rejectWithError({
      name:   'MQ_ROUTER_UNKNOWN_MESSAGE_ID',
      source: `${this.sourceIdentifier}.callById`,
    });
  }

  /**
   * Setter for event emitter
   * @param {EventEmitter} emitter event emitter
   * @returns {undefined}
   * @public
   */
  setMessagesTimeoutListener({ emitter }) {
    this.mqrEvents = emitter;
  }

  /**
   * Check requests for expire
   * @returns {undefined}
   * @private
   */
  checkRequestsQueue() {
    if (this.mqrEvents && (this.mqRequestIds.length !== 0)) {
      const currentTime = Date.now();
      const timeoutError = Reflect.construct(IError, [{
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
  MQRequestsRoutingTable,
};
