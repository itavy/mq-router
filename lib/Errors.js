'use strict';

/**
 * Utilities module
 * @module MQRouter/Errors
 */

module.exports = {
  MQ_SERIALIZE_ERROR: {
    name:    'MQ_SERIALIZE_ERROR',
    message: 'Serialization error',
  },
  MQ_UNSERIALIZE_ERROR: {
    name:    'MQ_UNSERIALIZE_ERROR',
    message: 'Unserialization error',
  },
  MQ_SERIALIZER_UNKNOWN_TYPE: {
    name:    'MQ_SERIALIZER_UNKNOWN_TYPE',
    message: 'Unknown serialization type:',
  },

  MQ_RABBITMQ_START_ERROR: {
    name:    'MQ_RABBITMQ_START_ERROR',
    message: 'Rabbit mq start error',
  },
  MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR: {
    name:    'MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR',
    message: 'Rabbit mq setup subscribe error',
  },
  MQ_RABBITMQ_SUBSCRIBE_REJECTED: {
    name:    'MQ_RABBITMQ_SUBSCRIBE_REJECTED',
    message: 'Rabbit mq subscribe rejected',
  },
  MQ_RABBITMQ_SUBSCRIBE_ERROR: {
    name:    'MQ_RABBITMQ_SUBSCRIBE_ERROR',
    message: 'Rabbit mq subscribe error',
  },
  MQ_RABBITMQ_UNSUBSCRIBE_REJECTED: {
    name:    'MQ_RABBITMQ_UNSUBSCRIBE_REJECTED',
    message: 'Rabbit mq unsubscribe rejected',
  },
  MQ_RABBITMQ_UNSUBSCRIBE_ERROR: {
    name:    'MQ_RABBITMQ_UNSUBSCRIBE_ERROR',
    message: 'Rabbit mq unsubscribe error',
  },
  MQ_RABBITMQ_PUBLISH_REJECTED: {
    name:    'MQ_RABBITMQ_PUBLISH_REJECTED',
    message: 'Rabbit mq publish rejected',
  },
  MQ_RABBITMQ_PUBLISH_ERROR: {
    name:    'MQ_RABBITMQ_PUBLISH_ERROR',
    message: 'Rabbit mq publish error',
  },
  MQ_RABBITMQ_SETUP_CHANNEL_ERROR: {
    name:    'MQ_RABBITMQ_SETUP_CHANNEL_ERROR',
    message: 'Rabbit mq setup channel error',
  },
  MQ_RABBITMQ_CONNECT_ERROR: {
    name:    'MQ_RABBITMQ_CONNECT_ERROR',
    message: 'Rabbit mq connection error',
  },
};
