'use strict';

/**
 * Utilities module
 * @module MQRouter
 */

var _require = require('./MQQueuesRoutingTable');

const MQRequestsRoutingTable = _require.MQRequestsRoutingTable;

var _require2 = require('./MQQueuesRoutingTable');

const MQQueuesRoutingTable = _require2.MQQueuesRoutingTable;

var _require3 = require('./MQRouter');

const MQRouter = _require3.MQRouter;

var _require4 = require('@itavy/mq-connector');

const types = _require4.types;


module.exports = {
  types,
  MQRequestsRoutingTable,
  MQQueuesRoutingTable,
  MQRouter
};