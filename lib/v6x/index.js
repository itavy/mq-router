'use strict';

/**
 * Utilities module
 * @namespace itavy/mq-router
 */

var _require = require('./RequestsRoutingTable');

const RequestsRoutingTable = _require.RequestsRoutingTable;

var _require2 = require('./QueuesRoutingTable');

const QueuesRoutingTable = _require2.QueuesRoutingTable;

var _require3 = require('./MQRouter');

const MQRouter = _require3.MQRouter;

var _require4 = require('@itavy/mq-connector');

const types = _require4.types;


module.exports = {
  types,
  RequestsRoutingTable,
  QueuesRoutingTable,
  MQRouter
};