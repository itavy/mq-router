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
  ],
  di,
}));

module.exports = {
  RabbitMQ,
  getConnector,
};
