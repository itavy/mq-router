'use strict';

/**
 * Utilities module
 * @module MQRouter/Connetors
 */

 /**
  * Interface for MQ Connectors
  *
  * @interface MQConnector
  */


const rabbitMQLib = require('./RabbitMQ');
const utils = require('../utilities').getUtilities();


const connectors = new Map();
connectors.set('RABBITMQ', {
  getConnector: di => rabbitMQLib.getConnector({
    moduleName: di.moduleName,
    connURI:    di.connURI,
    utils:      di.utils || utils,
  }),
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
 * @return {MQSerializer} an instance of required connector
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
