'use strict';

/**
 * Utilities module
 * @module MQRouter/Serializers/MQJSONSerializer
 */

/**
 * @typedef {Object} MQJSONSerializerDependency
 * @property {String} moduleName module name
 * @property {external:@itavy/utilities} utils required utils
 */

/**
 *  MQ JSON Serializer
 */
class MQJSONSerializer {
  /**
   * MQJSONSerializer constructor
   * @param {MQJSONSerializerDependency} di dependencies required for MQJSONSerializer
   */
  constructor(di) {
    /**
     * Utilities
     * @type {external:@itavy/utilities}
     * @private
     */
    this.utils = di.utils;

    this.errors = di.errors;
  }

  /**
   * @param {module:MQRouter~MQMessage} request object to be serialized
   * @return {Promise.<Uint8Array>} return a Uint8Array with object serialized
   */
  serialize(request) {
    return new Promise((resolve) => {
      this.utils.serializeJSON({
        msgId:     request.msgId,
        timestamp: request.timestamp,
        replyTo:   request.replyTo,
        replyOn:   request.replyOn,
        message:   Array.from(request.message),
      })
        .then(jsonSerialized => resolve(this.utils.stringToUint8Array(jsonSerialized)));
    })

    .catch(err => Promise.reject(this.utils.createError({
      name:    this.errors.MQ_SERIALIZE_ERROR.name,
      error:   err,
      message: this.errors.MQ_SERIALIZE_ERROR.message,
    })));
  }

  /**
   * @param {Uint8Array} request Uint8Array to be unserialized
   * @return {Promise.<module:MQRouter~MQMessage>} return a {module:MQRouter.MQMessage}
   */
  unserialize(request) {
    return new Promise(resolve => resolve(this.utils.stringFromUint8Array(request)))
      .then(jsonString => this.utils.unserializeJSON(jsonString))
      .then(uMessage => new Promise(resolve => resolve({
        msgId:     uMessage.msgId,
        timestamp: uMessage.timestamp,
        replyTo:   uMessage.replyTo,
        replyOn:   uMessage.replyOn,
        message:   Uint8Array.from(uMessage.message),
      })))
    .catch(err => Promise.reject(this.utils.createError({
      name:    this.errors.MQ_UNSERIALIZE_ERROR.name,
      error:   err,
      message: this.errors.MQ_SERIALIZE_ERROR.message,
    })));
  }
}

module.exports = {
  MQJSONSerializer,
};
