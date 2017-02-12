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
const utils = require('@itavy/utilities').getUtilities();
const errors = require('../Errors');


const serializers = new Map();
serializers.set('JSON', {
  getSerializer: di => Reflect.construct(
    JSONLib.MQJSONSerializer,
    [
      utils.extend({ errors }, di),
    ]),
  instance: null,
});

/**
 * MQ Serializer Singleton Factory
 * @param  {Object} request request serialization
 * @return {MQSerializer} an instance of required serializer
 */
const getSerializer = (request) => {
  if (!serializers.has(request.type)) {
    throw utils.createError({
      name:    errors.MQ_SERIALIZER_UNKNOWN_TYPE.name,
      message: `${errors.MQ_SERIALIZER_UNKNOWN_TYPE.message}: '${request.type}'`,
    });
  }
  if (null === serializers.get(request.type).instance) {
    const newSerializer = serializers.get(request.type);
    newSerializer.instance = serializers.get(request.type).getSerializer(
      utils.extend(request, { utils }));
    serializers.set(request.type, newSerializer);
  }
  return serializers.get(request.type).instance;
};

module.exports = {
  getSerializer,
};
