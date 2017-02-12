'use strict';

/**
 * RabbitMQ Connector module
 * @module MQRouter/Connetors/RabbitMQ
 */

 /**
  * @typedef {Object} RabbitMQDependency
  * @property {String} connURI module name
  * @property {external:@itavy/utilities} utils required utils
  */

/**
 * RabbitMQ Connector
 */
class RabbitMQ {
  /**
   * RabbitMQ constructor
   * @param {RabbitMQDependency} di dependencies required for RabbitMQ
   * @returns {RabbitMQ} instance of RabbitMQ connector
   */
  constructor(di) {
    /**
     * Utilities
     * @type {module:MQRouter/Utilities.MQUtils}
     * @private
     */
    this.utils = di.utils;
    this.errors = di.errors;
    this.connection = {
      mqLib:    di.mqLib,
      instance: null,
      publish:  {
        channel:    null,
        defaultTTL: di.publishTTL,
      },
      uri:      di.connURI,
      exchange: {
        name:    di.exchangeName,
        options: this.utils.extend(di.exchangeOptions, {
          durable:    true,
          autoDelete: true,
        }),
      },
      queueDefaultOptions: {
        exclusive:  false,
        durable:    false,
        autoDelete: true,
      },
      subscribedChannels: new Map(),
    };
  }

  /**
   * setup own listeners and publish channel
   * @param {module:MQRouter/Connectors~MQConnectionDefinition} request
   * default start parameters
   * @return {Promise} returns nothing on success
   */
  start(request) {
    this.connect()
      .then(mqConn => Promise.resolve(this.connection.instance = mqConn))
      .then(() => this.setupChannel())
      .then((ch) => {
        this.connection.publish.channel = ch;
        return Promise.resolve();
      })
      .then(() => this.subscribe(request.mqListen))

    // catch anything than can go wrong
    .catch(err => Promise.reject(this.utils.createError({
      name:    this.errors.MQ_RABBITMQ_START_ERROR.name,
      error:   err,
      message: this.errors.MQ_RABBITMQ_START_ERROR.message,
    })));
  }

  /**
   * Subscribe
   * @param {module:MQRouter/Connectors~MQSubscribeDefinition} request
   * queue subscribe definition
   * @returns {Promise} returns nothing on success
   * @public
   */
  subscribe(request) {
    return this.setupSubscribe(request)
      // setup listen handler
      .then(queueSetup => (queueSetup.channel.consume(queueSetup.queue, message => (
        request.handler({
          message: message.content,
          rkey:    message.fields.routingKey,
          // @TODO extend ack to respond with publish if supplied
          ack:     () => queueSetup.channel.ack(message),
          nack:    options => queueSetup.channel.nack(message, false, !options.final),
        })
      ), { noAck: false })
        .then((respSubscribe) => {
          if (true === respSubscribe) {
            this.connection.subscribedChannels.add(request.queue.rkey, queueSetup.channel);
            return Promise.resolve();
          }
          return queueSetup.channel.close()
            .then(() => Promise.reject(this.utils.createError({
              name:    this.errors.MQ_RABBITMQ_SUBSCRIBE_REJECTED.name,
              message: this.errors.MQ_RABBITMQ_SUBSCRIBE_REJECTED.message,
            })));
        })
      ))

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createError({
        name:    this.errors.MQ_RABBITMQ_SUBSCRIBE_ERROR.name,
        error:   err,
        message: this.errors.MQ_RABBITMQ_SUBSCRIBE_ERROR.message,
      })));
  }
  /**
   * Unsubscribe from a queue
   * @param {module:MQRouter/Connectors~MQUnsubscribeDefinition} request
   * unsubscribe request
   * @returns {Promise} returns nothing on success
   * @public
   */
  unsubscribe(request) {
    return new Promise((resolve, reject) => {
      if (this.connection.subscribedChannels.has(request.rkey)) {
        return this.connection.subscribedChannels.get(request.rkey).close()
          .then(() => resolve());
      }
      return reject(this.utils.createError({
        name:    this.errors.MQ_RABBITMQ_UNSUBSCRIBE_REJECTED.name,
        message: this.errors.MQ_RABBITMQ_UNSUBSCRIBE_REJECTED.message,
      }));
    })

    // catch anything than can go wrong
    .catch(err => Promise.reject(this.utils.createError({
      name:    this.errors.MQ_RABBITMQ_UNSUBSCRIBE_ERROR.name,
      error:   err,
      message: this.errors.MQ_RABBITMQ_UNSUBSCRIBE_ERROR.message,
    })));
  }
  /**
   * Subscribe
   * @param {module:MQRouter/Connectors~MQPublishDefinition} request
   * publish request
   * @returns {Promise} returns nothing on success
   * @public
   */
  publish(request) {
    return this.connection.publish.channel.publish(this.connection.exchange.name,
      request.rkey, request.message,
      { expiration: request.options.ttl || this.connection.publish.defaultTTL })
      .then((publishResponse) => {
        if (true === publishResponse) {
          return Promise.resolve();
        }
        return Promise.reject(this.utils.createError({
          name:    this.errors.MQ_RABBITMQ_PUBLISH_REJECTED.name,
          message: this.errors.MQ_RABBITMQ_PUBLISH_REJECTED.message,
        }));
      })

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createError({
        name:    this.errors.MQ_RABBITMQ_PUBLISH_ERROR.name,
        error:   err,
        message: this.errors.MQ_RABBITMQ_PUBLISH_ERROR.message,
      })));
  }

  /**
   * rabbitmq setup channel
   * @param {module:MQRouter/Connectors~MQSubscribeDefinition} request
   * queue subscribe definition
   * @return {Promise} resolves with channel
   * @private
   */
  setupChannel(request) {
    return this.connection.instance.createConfirmChannel()
      // setup message limit if required
      // don't use global flag since it will break connection on rabbitmq
      // older than v3.3.0 @see http://www.squaremobius.net/amqp.node/channel_api.html#channel_prefetch
      .then(ch => (ch.prefetch(request.limit || 0)
        .then(() => Promise.resolve(ch))
      ))
      // assert exchange if exists with provided options
      .then(ch => (ch.assertExchange(this.connection.exchangeName, 'topic', this.connection.exchangeOptions)
        .then(() => Promise.resolve(ch))
      ))

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createError({
        name:    this.errors.MQ_RABBITMQ_SETUP_CHANNEL_ERROR.name,
        error:   err,
        message: this.errors.MQ_RABBITMQ_SETUP_CHANNEL_ERROR.message,
      })));
  }

  /**
   * rabbitmq setup subscribe
   * @param {module:MQRouter/Connectors~MQSubscribeDefinition} request
   * queue subscribe definition
   * @return {Promise} resolves with channel and queue
   * @private
   */
  setupSubscribe(request) {
    return this.setupChannel(request)
      // map explicit the received options;
      // if the general definition of options will change then
      // only here will be needed to change
      .then((ch) => {
        let computedOptions = {};
        if (this.utils.has(request, 'options')) {
          computedOptions = {
            exclusive:  request.options.exclusive,
            durable:    request.options.durable,
            autoDelete: request.options.autoDelete,
          };
        }
        return Promise.resolve({
          channel:      ch,
          queueOptions: this.utils.extend(computedOptions, this.connection.queueDefaultOptions),
        });
      })
      // assert queue with computed options
      .then(ch => (ch.channel.assertQueue(request.name || '', ch.queueOptions)
        .then(q => Promise.resolve({
          channel: ch.channel,
          queue:   q,
        }))
      ))
      // bind queue to routing keys
      // to check if it will fail if it is allready binded
      .then(ch => (
        ch.channel.bindQueue(ch.queue.queue, this.connection.exchangeName, request.rkey)
          .then(() => Promise.resolve(ch))
      ))
      // resolve back
      .then(ch => Promise.resolve({
        channel: ch.channel,
        queue:   ch.queue.queue,
      }))

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createError({
        name:    this.errors.MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR.name,
        error:   err,
        message: this.errors.MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR.message,
      })));
  }

  /**
   * Connect to rabbitmq server
   * @return {Promise} return nothing on success
   * @private
   */
  connect() {
    return this.connection.mqLib.connect(this.connection.uri)
      .then((mqConn) => {
        this.connection.instance = mqConn;
        return Promise.resolve();
      })
      .catch((err) => {
        this.connection.instance = -1;
        return Promise.reject(this.utils.createError({
          name:    this.errors.MQ_RABBITMQ_CONNECT_ERROR.name,
          error:   err,
          message: this.errors.MQ_RABBITMQ_CONNECT_ERROR.message,
        }));
      });
  }
}

module.exports = {
  RabbitMQ,
};
