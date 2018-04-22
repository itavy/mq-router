'use strict';

/**
 * MQRouter module
 * @namespace itavy/mq-router
 */

const { RequestsRoutingTable } = require('./RequestsRoutingTable');
const { QueuesRoutingTable } = require('./QueuesRoutingTable');
const { MQRouter } = require('./MQRouter');
const { types } = require('@itavy/mq-connector');

module.exports = {
  types,
  RequestsRoutingTable,
  QueuesRoutingTable,
  MQRouter,
};
