'use strict';

var _require = require('./Helpers');

const MS_FACTOR = _require.MS_FACTOR;

var _require2 = require('@itavy/ierror');

const IError = _require2.IError;

/**
 * MQRequestsRoutingTable class
 */

class RequestsRoutingTable {
  /**
   * @param {String} name router name
   * @param {Number} [checkInterval=200] check interval in ms to see if requests have passed
   * their ttl
   */
  constructor({
    name,
    checkInterval = 200
  }) {
    this.mqrEvents = null;

    this.sourceIdentifier = `${name}.RequestsRoutingTable`;
    this.mqRequestIds = [];

    // @todo optimization: set interval only if there are requests pending
    this.checkIntervalId = setInterval(() => this.checkRequestsQueue(), checkInterval);
  }

  /**
   * Register a check for a request
   * @param {Buffer} serializedMessage message to be sent
   * @param {String} id message id
   * @param {Object} options message options
   * @returns {Promise} resolves with promise that will be resolved upon receiving message
   * @public
   */
  register({
    id,
    options
  }) {
    this.mqRequestIds.push({
      ts: Date.now(),
      ttl: options.ttl * MS_FACTOR,
      id
    });
    return new Promise((resolve, reject) => {
      this.mqrEvents.once(`${id}`, ({ error, response }) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  }

  /**
   * Resolve a request
   * @param {String} id message id
   * @param {Buffer} [message=null] response message
   * @param {Object} [error=null] error to be sent to handler
   * @returns {Boolean} true if listener exists
   * @throws {IError} if listener does not exists
   * @public
   */
  callById({ id, message = null, error = null }) {
    const listenerExists = this.mqrEvents.emit(`${id}`, {
      response: message,
      error
    });
    if (listenerExists) {
      // do not delegate to unregister because:
      // 1. it is async and in next tick it might unregistered with timeout
      // 2. i dont want to force it with next tick, it will delay the timer for checking
      this.mqRequestIds = this.mqRequestIds.filter(el => el.id !== id);
      return { message: null };
    }
    throw Reflect.construct(IError, [{
      name: 'MQ_ROUTER_UNKNOWN_MESSAGE_ID',
      source: `${this.sourceIdentifier}.callById`
    }]);
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
    if (this.mqrEvents && this.mqRequestIds.length !== 0) {
      const currentTime = Date.now();
      const timeoutError = Reflect.construct(IError, [{
        name: 'MQ_ROUTER_MESSAGE_TIMEOUT',
        source: `${this.sourceIdentifier}.checkRequestsQueue`
      }]);
      this.mqRequestIds = this.mqRequestIds.filter(el => {
        if (currentTime - el.ts >= el.ttl) {
          this.mqrEvents.emit(`${el.id}`, { error: timeoutError });
          return false;
        }
        return true;
      });
    }
  }

  /**
   * Stops checks for expired messages
   * @returns {undefined}
   * @public
   */
  close() {
    clearInterval(this.checkIntervalId);
    this.checkIntervalId = null;
    // @todo flush registered pending requests
  }
}

module.exports = {
  RequestsRoutingTable
};