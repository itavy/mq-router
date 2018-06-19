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

const { IError } = require('@itavy/ierror');
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
   * @param {Boolean} [duplicate=true] if false, check if the queue is already bound
   * @returns {itavy/MQRouter.QueuesRoutingTable.RegisterResponse} RegisterResponse
   * @public
   */
  register({
    handler,
    queue,
    topic,
    exchange,
    duplicate = true,
  }) {
    if (!duplicate) {
      const exists = this.getHandlerRefsByProperties({
        queue,
        topic,
        exchange,
      });
      if (exists) {
        // console.log(exists); /* eslint no-console: ["off"] */
        this.handlers[exists.index].count += 1;
        return exists;
      }
    }

    const index = uuid();
    this.handlers[index] = {
      consumerTag: null,
      queue,
      topic,
      exchange,
      handler,
      count:       0,
    };
    return {
      index,
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
      consumerTag,
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
      if (this.handlers[index].count === 0) {
        const { [index]: { consumerTag }, ...remainingHandlers } = this.handlers;
        this.handlers = remainingHandlers;
        const { [consumerTag]: _, ...remainingConsumerTags } = this.consumerTags;
        this.consumerTags = remainingConsumerTags;
        return true;
      }
      this.handlers[index].count -= 1;
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
      name:   'MQ_ROUTING_TABLE_UNKNOWN_INDEX',
      source: `${this.sourceIdentifier}.getHandlerByIndex`,
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
      name:   'MQ_ROUTING_TABLE_UNKNOWN_CONSUMER_TAG',
      source: `${this.sourceIdentifier}.getHandlerByConsumerTag`,
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
  getHandlerRefsByProperties({ queue, topic, exchange }) {
    try {
      const { consumerTag } = Object.values(this.handlers).find(handler =>
        handler.queue === queue &&
        handler.topic === topic &&
        handler.exchange === exchange);
      if (consumerTag) {
        return { consumerTag, index: this.consumerTags[consumerTag] };
      }
      return null;
    } catch (cause) {
      // console.log('ergereghertdhwrthwretehjwer6t'); /* eslint no-console: ["off"] */
      return null;
    }
  }
}

module.exports = {
  QueuesRoutingTable,
};
