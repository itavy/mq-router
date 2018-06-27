'use strict';

/**
 * @typedef {Object} RegisterResponse
 * @memberOf itavy/MQRouter.QueuesRoutingTable
 * @property {String} index
 */
/**
 * @typedef {Object} UpdateResponse
 * @memberOf itavy/MQRouter.QueuesRoutingTable
 * @property {String} index
 * @property {String} queue
 * @property {String} consumerTag,
 */
/**
 * @typedef {Object} QueueHandler
 * @memberOf itavy/MQRouter.QueuesRoutingTable
 * @property {String} consumerTag
 * @property {String} queue
 * @property {String} topic
 * @property {String} exchange
 * @property {Promise} handler
 */

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var _require = require('@itavy/ierror');

const IError = _require.IError;

const uuid = require('uuid/v4');

/**
 * MQQueuesRoutingTable class
 * @memberOf itavy/MQRouter
 */
class QueuesRoutingTable {
  /**
   * @param {String} name router name
   */
  constructor({ name }) {
    this.sourceIdentifier = `${name}.QueuesRoutingTable`;

    this.handlers = {};
    this.consumerTags = {};
  }

  /**
   * register a handler in routing table
   * @param {Promise} handler handler to be called when a message is received
   * @param {String} queue queue name
   * @param {String} topic topic name
   * @param {String} exchange exchange name
   * @returns {itavy/MQRouter.QueuesRoutingTable.RegisterResponse} RegisterResponse
   * @public
   */
  register({
    handler,
    queue,
    topic,
    exchange
  }) {
    const index = uuid();
    this.handlers[index] = {
      consumerTag: null,
      queue,
      topic,
      exchange,
      handler
    };
    return {
      index
    };
  }

  /**
   * update record info after subscribing
   * @param {String} index record index
   * @param {String} queue new queue name
   * @param {String} consumerTag consumerTag
   * @returns {itavy/MQRouter.QueuesRoutingTable.UpdateResponse} UpdateResponse
   * @public
   */
  update({ index, queue, consumerTag }) {
    this.handlers[index].queue = queue;
    this.handlers[index].consumerTag = consumerTag;
    this.consumerTags[consumerTag] = index;
    return {
      index,
      queue,
      consumerTag
    };
  }

  /**
   * removes a handler from routing table
   * @param {String} index record index to be removed
   * @returns {Boolean} returns true if handler exists and was removed
   * @public
   */
  unregister({ index }) {
    if (this.handlers[index]) {
      var _handlers = this.handlers;

      const consumerTag = _handlers[index].consumerTag,
            remainingHandlers = _objectWithoutProperties(_handlers, [index]);

      this.handlers = remainingHandlers;

      var _consumerTags = this.consumerTags;

      const _ = _consumerTags[consumerTag],
            remainingConsumerTags = _objectWithoutProperties(_consumerTags, [consumerTag]);

      this.consumerTags = remainingConsumerTags;

      return true;
    }
    return false;
  }

  /**
   * locate handler for index
   * @param {String} index handler index
   * @returns {itavy/MQRouter.QueuesRoutingTable.QueueHandler} QueueHandler
   * @throws {IError}
   * @public
   */
  getHandlerByIndex({ index }) {
    if (this.handlers[index]) {
      return this.handlers[index];
    }
    throw Reflect.construct(IError, [{
      name: 'MQ_ROUTING_TABLE_UNKNOWN_INDEX',
      source: `${this.sourceIdentifier}.getHandlerByIndex`
    }]);
  }

  /**
   * locate handler for consumer tag
   * @param {String} consumerTag handler consumerTag
   * @returns {itavy/MQRouter.QueuesRoutingTable.QueueHandler} QueueHandler
   * @throws {IError}
   * @public
   */
  getHandlerByConsumerTag({ consumerTag }) {
    const index = this.consumerTags[consumerTag];
    if (index) {
      return this.getHandlerByIndex({ index });
    }
    throw Reflect.construct(IError, [{
      name: 'MQ_ROUTING_TABLE_UNKNOWN_CONSUMER_TAG',
      source: `${this.sourceIdentifier}.getHandlerByConsumerTag`
    }]);
  }

  /**
   * locate refs by properties
   * @param {String} queue queue name
   * @param {String} topic topic name
   * @param {String} exchange exchange name
   * @returns {Object} index and consumerTag
   * @public
   */
  getHandlerRefsByProperties({
    queue,
    topic,
    exchange
  }) {
    const handler = Object.values(this.handlers).find(el => el.queue === queue && el.topic === topic && el.exchange === exchange);

    if (handler && handler.consumerTag) {
      return {
        consumerTag: handler.consumerTag,
        index: this.consumerTags[handler.consumerTag]
      };
    }

    return {
      consumerTag: null,
      index: null
    };
  }
}

module.exports = {
  QueuesRoutingTable
};