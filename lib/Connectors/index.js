'use strict';

/**
 * Utilities module
 * @module MQRouter/Connectors
 */

 /**
  * Interface for MQ Connectors
  *
  * @interface MQConnector
  */
/**
 * @typedef {Object} MQSubscribeDefinition
 * @property {String} [name=null] queue name for subscribing
 * @property {String} rkey routing key under which it will subscribe
 * @property {Function} handler handler to be called with received messages
 * @property {Number} [limit=0] max number of messages to be processed
 * @property {Object} [options={}] options for defining queue
 */
/**
  * @typedef {Object} MQUnsubscribeDefinition
  * @property {String} rkey routing key under which it will subscribe
  */
 /**
  * @typedef {Object} MQPublishDefinition
  * @property {String} rkey routing key under which it will subscribe
  * @property {Uint8Array} message the message to be sent
  * @property {Object} [options={}] options for defining queue
  * @property {Number} [options.ttl=0] ttl in ms for message
  */

 /**
  * @typedef {Object} MQConnectionDefinition
  * @param {MQSubscribeDefinition} mqListen definition for own queue to listen
  */

const utils = require('@itavy/utilities').getUtilities();
const rabbitMQLib = require('./RabbitMQ');
const errors = require('../Errors');


const connectors = new Map();
connectors.set('RABBITMQ', {
  getConnector: di => Reflect.construct(
    rabbitMQLib.RabbitMQ,
    [
      {
        connURI:         di.connURI,
        utils:           di.utils || utils,
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        mqLib:           require('amqplib'),
        exchangeName:    di.exchangeName,
        exchangeOptions: di.exchangeOptions,
        publishTTL:      di.publishTTL,
        errors,
      },
    ]),
  instance: null,
});

/**
 * MQ Connector Factory
 * @param  {Object} request request connector
 * @return {MQConnector} an instance of required connector
 */
const getNewConnector = (request) => {
  if (connectors.has(request.type)) {
    return connectors.get(request.type).getConnector(request);
  }
  throw utils.createMQError({
    name: 'MQ_CONNECTOR_UNKNOWN_TYPE',
  }, `Unknown requested type: '${request.type}'`);
};

/**
 * MQ Connector Singleton Factory
 * @param  {Object} request request connector
 * @return {MQConnector} an instance of required connector
 */
const getConnector = (request) => {
  if (connectors.has(request.type)) {
    if (null === connectors.get(request.type).instance) {
      const newInstance = {
        instance: getNewConnector(request),
      };
      const newConnector = utils.extend(connectors.get(request.type), newInstance);
      connectors.set(request.type, newConnector);
    }
    return connectors.get(request.type).instance;
  }
  throw utils.createMQError({
    name: 'MQ_CONNECTOR_UNKNOWN_TYPE',
  }, `Unknown requested type: '${request.type}'`);
};

module.exports = {
  getNewConnector,
  getConnector,
};
