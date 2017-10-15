'use strict';

/**
 * Utilities module
 * @module MQRouter/Errors
 */

const errors = [{
  name: 'MQ_ROUTING_TABLE_UNKNOWN_INDEX'
}, {
  name: 'MQ_ROUTING_TABLE_UNKNOWN_CONSUMER_TAG'
}, {
  name: 'MQ_ROUTER_UNKNOWN_MESSAGE_ID'
}, {
  name: 'MQ_ROUTER_MESSAGE_TIMEOUT'
}];

module.exports = {
  errors
};