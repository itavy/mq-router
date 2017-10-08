'use strict';

/**
 * Utilities module
 * @module MQRouter/Errors
 */

module.exports = {
  MQ_SERIALIZE_ERROR: {
    name:    'MQ_SERIALIZE_ERROR',
    message: 'Serialization error'
  },
  MQ_UNSERIALIZE_ERROR: {
    name:    'MQ_UNSERIALIZE_ERROR',
    message: 'Unserialization error'
  },
  MQ_SERIALIZER_UNKNOWN_TYPE: {
    name:    'MQ_SERIALIZER_UNKNOWN_TYPE',
    message: 'Unknown serialization type:'
  }
};
