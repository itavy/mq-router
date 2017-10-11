'use strict';

const { uuid, rejectWithError } = require('./Helpers');

/**
 * MQQueuesRoutingTable class
 */
class MQQueuesRoutingTable {
  /**
   * @param {String} name router name
   */
  constructor({ name }) {
    this.sourceIdentifier = `${name}.MQQueuesRoutingTable`;

    this.handlers = {};
    this.consumerTags = {};
  }

  /**
   * register a handler in routing table
   * @param {Promise} handler handler to be called when a message is received
   * @param {String} queue queue name
   * @param {String} topic topic name
   * @param {String} exchange exchange name
   * @returns {Promise} resolves with record index for future reference
   * @public
   */
  register({
    handler,
    queue,
    topic,
    exchange,
  }) {
    const index = uuid();
    this.handlers[index] = {
      consumerTag: null,
      queue,
      topic,
      exchange,
      handler,
    };
    return Promise.resolve({
      index,
    });
  }

  /**
   * update record info after subscribing
   * @param {String} index record index
   * @param {String} queue new queue name
   * @param {String} consumerTag consumerTag
   * @returns {Promise} resolves on success
   * @public
   */
  update({ index, queue, consumerTag }) {
    this.handlers[index].queue = queue;
    this.handlers[index].consumerTag = consumerTag;
    this.handlers[consumerTag] = index;
    return Promise.resolve({
      index,
      queue,
      consumerTag,
    });
  }

  /**
   * removes a handler from routing table
   * @param {String} index record index to be removed
   * @returns {Promise} resolves with true if index exists false otherwise
   * @public
   */
  unregister({ index }) {
    if (this.handlers[index]) {
      const { consumerTag } = this.handlers[index];
      delete this.handlers[index];
      delete this.consumerTags[consumerTag];

      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  /**
   * locate handler for index
   * @param {String} index handler index
   * @returns {Promise} resolves with handler on success
   * @public
   */
  getHandlerByIndex({ index }) {
    if (this.handlers[index]) {
      return Promise.resolve(this.handlers[index]);
    }
    return rejectWithError({
      name:   'MQ_ROUTING_TABLE_UNKNOWN_INDEX',
      source: `${this.sourceIdentifier}.getHandlerByIndex`,
    });
  }

  /**
   * locate handler for consumer tag
   * @param {String} consumerTag handler consumerTag
   * @returns {Promise} resolves with handler on success
   * @public
   */
  getHandlerByConsumerTag({ consumerTag }) {
    const index = this.consumerTags[consumerTag];
    if (index) {
      return this.getHandlerByIndex({ index });
    }
    return rejectWithError({
      name:   'MQ_ROUTING_TABLE_UNKNOWN_CONSUMER_TAG',
      source: `${this.sourceIdentifier}.getHandlerByConsumerTag`,
    });
  }
}

module.exports = {
  MQQueuesRoutingTable,
};
