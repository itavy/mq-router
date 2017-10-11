'use strict';

/**
 * Utilities module
 * @module MQRouter
 */
/**
 * MQ Message Structure
 * @typedef {Object} MQMessage
 * @property {String} msgId
 * @property {Number} [timestamp=0]
 * @property {String|null} [replyTo=null]
 * @property {String|null} [replyOn=null]
 * @property {Uint8Array} message
 */

const { MQRequestsRoutingTable } = require('./MQQueuesRoutingTable');
const { MQQueuesRoutingTable } = require('./MQQueuesRoutingTable');
const { MQRouter } = require('./MQRouter');
const mqStructureLib = require('@itavy/mq-structure');
const mqConnector = require('@itavy/mq-connector');


/**
 * Get mq router
 * @param {String} name router name
 * @param {String} [queue=''] own queue on which it will listen
 * @param {String} [topic=''] own topic on which it will listen
 * @param {String} [exchange=''] in case of topic what exchange will be used to bind the topic
 * @param {String} mqURI mq connection details
 * @param {String} [type=mqConnector.types.RABBIT_MQ] connector type
 * @param {Function} [errorColector] function to be called when unknown messages are received
 * @param {Function} [defaultHandler] function which resolves to a promise to be called
 * when it receives specific messages
 * @param {Number} [defaultTTL=5] default ttl in seconds for messages or requests sent
 * @returns {MQRouter} mq router
 */
const getRouter = ({
  name,
  queue,
  topic,
  exchange,
  mqURI,
  type = mqConnector.types.RABBIT_MQ,
  errorCollector = null,
  defaultHandler = null,
  defaultTTL = 5,
}) => Reflect.construct(MQRouter, [{
  requestsRoutingTable: Reflect.construct(MQRequestsRoutingTable, [{ name }]),
  queuesRoutingTable:   Reflect.construct(MQQueuesRoutingTable, [{ name }]),
  mqStructure:          mqStructureLib.MQMessage,
  serializer:           mqStructureLib.getSerializer(),
  connector:            mqConnector.getConnector(type, {
    mqURI,
  }),
  name,
  queue,
  topic,
  exchange,
  errorCollector,
  defaultHandler,
  defaultTTL,
}]);

module.exports = {
  types: mqConnector.types,
  getRouter,
};
