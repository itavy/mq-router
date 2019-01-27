'use strict';

/**
 * MQRouter module
 * @namespace itavy/mq-router
 */

const { types } = require('@itavy/mq-connector');
const { RequestsRoutingTable } = require('./RequestsRoutingTable');
const { QueuesRoutingTable } = require('./QueuesRoutingTable');
const { MQRouter } = require('./MQRouter');

module.exports = {
  types,
  RequestsRoutingTable,
  QueuesRoutingTable,
  MQRouter,
};
