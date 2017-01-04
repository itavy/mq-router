'use strict';

/**
 * RabbitMQ Connector module
 * @module MQRouter/Connetors/RabbitMQ
 */

 /**
  * @typedef {Object} RabbitMQDependency
  * @property {String} moduleName module name
  * @property {String} connURI module name
  * @property {module:MQRouter/Utilities~MQUtils} utils required utils
  */

/**
 * RabbitMQ Connector
 */
class RabbitMQ {
  /**
   * RabbitMQ constructor
   * @param {Object} di dependencies required for RabbitMQ
   * @param {String} di.moduleName module name
   * @param {module:MQRouter/Utilities~MQUtils} di.utils utilities
   */
  constructor(di) {
    this.module = `${di.moduleName}.RabbitMQ`;
    /**
     * Utilities
     * @type {module:MQRouter/Utilities.MQUtils}
     * @private
     */
    this.utils = di.utils;
    this.connection = {
      mqLib:      di.mqLib,
      instance:   null,
      uri:        di.connURI,
      connecting: false,
    };
  }
  /**
   * Subscribe
   * @returns {Promise} return on success
   * @public
   */
  subscribe() {
    return `subscribe ${this.module}`;
  }
  /**
   * Unsubscribe
   * @returns {Promise} return on success
   * @public
   */
  unsubscribe() {
    return `unsubscribe ${this.module}`;
  }
  /**
   * Unsubscribe
   * @returns {Promise} return on success
   * @public
   */
  publish() {
    return `publish ${this.module}`;
  }

  /**
   * Get rabbitmqConnection
   * @return {Promise} resolves with conenction
   * @private
   */
  getConnection() {
    return new Promise((resolve) => {
      if (null === this.connection.instance) {
        return this.connect()
          .then(() => resolve(this.connection.instance));
      }
      return resolve(this.connection.instance);
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_CONNECTION_ERROR',
      error: err,
      info:  {
        source: `${this.module}.getConnection.catch`,
      },
    }, 'Rabbit mq getConnection error')));
  }

  /**
   * Connect to rabbitmq server
   * @return {Promise} return nothing on success
   * @private
   */
  connect() {
    if (true === this.connection.connecting) {
      return this.waitForConnection();
    }
    this.connection.connecting = true;
    return this.connection.mqLib.connect(this.connection.connURI)
      .then((mqConn) => {
        this.connection.instance = mqConn;
        this.connection.connecting = false;
        return Promise.resolve();
      })
      .catch((err) => {
        this.connection.instance = -1;
        return Promise.reject(this.utils.createMQError({
          name:  'MQ_CONNECTION_ERROR',
          error: err,
          info:  {
            source: `${this.module}.connect.catch`,
          },
        }, 'Rabbit mq connection error'));
      });
  }

  /**
   * Loop for connection until it becomes available
   * @return {Promise} return nothing on success
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const evaluateConenction = () => { // eslint-disable-line require-jsdoc, consistent-return
        if (-1 === this.connetion) {
          return reject();
        }
        if (null !== this.connection) {
          return resolve();
        }
        setTimeout(evaluateConenction, 100);
      };
      evaluateConenction();
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_CONNECTION_ERROR',
      error: err,
      info:  {
        source: `${this.module}.waitForConnection.catch`,
      },
    }, 'Rabbit mq connection error')));
  }

}

/**
 * MQ JSON Serializer dependency validator
 * @param  {MQJSONSerializerDependency} di dependencies required for MQ JSON Serializer
 * @return {MQJSONSerializer}    instance of MQJSONSerializer
 */
const getConnector = di => new RabbitMQ(di.utils.validateConstructorDependencies({
  name:  'RabbitMQ',
  rules: [
    { name: 'moduleName', required: true },
    { name: 'connURI', required: true },
    { name: 'mqLib', required: true },
  ],
  di,
}));

module.exports = {
  RabbitMQ,
  getConnector,
};
