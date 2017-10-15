'use strict';

/**
 * Utilities module
 * @module MQRouter
 */

const { MQRequestsRoutingTable } = require('./MQQueuesRoutingTable');
const { MQQueuesRoutingTable } = require('./MQQueuesRoutingTable');
const { MQRouter } = require('./MQRouter');
const { types } = require('@itavy/mq-connector');

module.exports = {
  types,
  MQRequestsRoutingTable,
  MQQueuesRoutingTable,
  MQRouter,
};
