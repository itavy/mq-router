'use strict';

/**
 * Utilities module
 * @module MQRouter/Serializers
 */

/**
 * Interface for Serializers
 *
 * @interface MQSerializer
 */

/**
 * Serialize stub
 *
 * @function serialize
 * @memberof MQSerializer
 * @param {module:MQRouter~MQMessage} request object to be serialized
 * @return {Promise.<Uint8Array>} return a Uint8Array with object serialized
 */

/**
 * Unserialize stub
 *
 * @function
 * @name MQSerializer#unserialize
 * @param {Uint8Array} request Uint8Array to be unserialized
 * @return {Promise.<module:MQRouter~MQMessage>} return a {module:MQRouter.MQMessage}
 *
 */

const JSONLib = require('./JSONSerializer');
const utils = require('../utilities').getUtilities();


const serializers = new Map();
serializers.set('JSON', {
  getSerializer: di => JSONLib.getSerializer({
    moduleName: di.moduleName,
    utils:      di.utils || utils,
  }),
  instance: null,
});

/**
 * MQ Serializer Factory
 * @param  {Object} request request serialization
 * @return {MQSerializer} an instance of required serializer
 */
const getNewSerializer = (request) => {
  if (serializers.has(request.type)) {
    return serializers.get(request.type).getSerializer(request);
  }
  throw utils.createMQError({
    name: 'MQ_SERIALIZER_UNKNOWN_TYPE',
  }, `Unknown requested type: '${request.type}'`);
};

/**
 * MQ Serializer Singleton Factory
 * @param  {Object} request request serialization
 * @return {MQSerializer} an instance of required serializer
 */
const getSerializer = (request) => {
  if (serializers.has(request.type)) {
    if (null === serializers.get(request.type).instance) {
      const newInstance = {
        instance: getNewSerializer(request),
      };
      const newSerializer = utils.extend(serializers.get(request.type), newInstance);
      serializers.set(request.type, newSerializer);
    }
    return serializers.get(request.type).instance;
  }
  throw utils.createMQError({
    name: 'MQ_SERIALIZER_UNKNOWN_TYPE',
  }, `Unknown requetsed type: '${request.type}'`);
};

module.exports = {
  getNewSerializer,
  getSerializer,
};
