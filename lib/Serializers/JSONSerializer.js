'use strict';

/**
 * Utilities module
 * @module MQRouter/Serializers/MQJSONSerializer
 */

/**
 * @typedef {Object} MQJSONSerializerDependency
 * @property {String} moduleName module name
 * @property {module:MQRouter/Utilities~MQUtils} utils required utils
 */

/**
 *  MQ JSON Serializer
 */
class MQJSONSerializer {
  /**
   * MQJSONSerializer constructor
   * @param {Object} di dependencies required for MQJSONSerializer
   * @param {String} di.moduleName module name
   * @param {module:MQRouter/Utilities~MQUtils} di.utils utilities
   */
  constructor(di) {
    this.module = `${di.moduleName}.MQJSONSerializer`;

    /**
     * @function
     * @param {*} variable to be serialized
     * @return {String} JSON reprezentation of the variable
     */
    this.stringify = di.jsonStringify;

    /**
     * Utilities
     * @type {module:MQRouter/Utilities.MQUtils}
     * @private
     */
    this.utils = di.utils;
  }

  /**
   * @param {module:MQRouter~MQMessage} request object to be serialized
   * @return {Promise.<Uint8Array>} return a Uint8Array with object serialized
   */
  serialize(request) {
    return new Promise((resolve) => {
      const sMessage = this.stringify({
        msgId:     request.msgId,
        timestamp: request.timestamp,
        replyTo:   request.replyTo,
        replyOn:   request.replyOn,
        message:   Array.from(request.message),
      });
      return resolve(this.utils.stringToUint8Array(sMessage));
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_SERIALIZE_ERROR',
      error: err,
      info:  {
        source: `${this.module}.serialize.catch`,
      },
    }, 'MQ serialization error')));
  }

  /**
   * @param {Uint8Array} request Uint8Array to be unserialized
   * @return {Promise.<module:MQRouter~MQMessage>} return a {module:MQRouter.MQMessage}
   */
  unserialize(request) {
    return new Promise((resolve) => {
      const uMessage = JSON.parse(this.utils.stringFromUint8Array(request));
      return resolve({
        msgId:     uMessage.msgId,
        timestamp: uMessage.timestamp,
        replyTo:   uMessage.replyTo,
        replyOn:   uMessage.replyOn,
        message:   Uint8Array.from(uMessage.message),
      });
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_UNSERIALIZE_ERROR',
      error: err,
      info:  {
        source: `${this.module}.unserialize.catch`,
      },
    }, 'MQ unserialization error')));
  }
}

/**
 * MQ JSON Serializer dependency validator
 * @param  {MQJSONSerializerDependency} di dependencies required for MQ JSON Serializer
 * @return {MQJSONSerializer}    instance of MQJSONSerializer
 */
const getSerializer = di => new MQJSONSerializer(di.utils.validateConstructorDependencies({
  name:  'MQJSONSerializer',
  rules: [
    { name: 'moduleName', required: true },
    { name: 'utils', required: true },
    { name: 'jsonStringify', required: false, defaultValue: () => JSON.stringify },
  ],
  di,
}));

module.exports = {
  getSerializer,
  MQJSONSerializer,
};
