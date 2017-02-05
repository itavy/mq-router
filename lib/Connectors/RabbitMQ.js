'use strict';

/**
 * RabbitMQ Connector module
 * @module MQRouter/Connetors/RabbitMQ
 */

 /**
  * @typedef {Object} RabbitMQDependency
  * @property {String} moduleName module name
  * @property {String} connURI module name
  * @property {module:MQRouter/Utilities~MQUtils} utils required utils
  */

/**
 * RabbitMQ Connector
 */
class RabbitMQ {
  /**
   * RabbitMQ constructor
   * @param {Object} di dependencies required for RabbitMQ
   * @param {String} di.moduleName module name
   * @param {module:MQRouter/Utilities~MQUtils} di.utils utilities
   */
  constructor(di) {
    this.module = `${di.moduleName}.RabbitMQ`;
    /**
     * Utilities
     * @type {module:MQRouter/Utilities.MQUtils}
     * @private
     */
    this.utils = di.utils;
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
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_START_ERROR',
      error: err,
      info:  {
        source: `${this.module}.start.catch`,
      },
    }, 'Rabbit mq start error')));
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
            .then(() => Promise.reject(this.utils.createMQError({
              name: 'MQ_SUBSCRIBE_REJECTED',
              info: {
                source: `${this.module}.subscribe`,
              },
            }, 'Rabbit mq subscribe error')));
        })
      ))

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createMQError({
        name:  'MQ_SUBSCRIBE_ERROR',
        error: err,
        info:  {
          source: `${this.module}.subscribe.catch`,
        },
      }, 'Rabbit mq subscribe error')));
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
      return reject(this.utils.createMQError({
        name: 'MQ_UNSUBSCRIBE_ERROR',
        info: {
          source: `${this.module}.unsubscribe`,
          rkey:   request.rkey,
        },
      }, 'Rabbit mq unsubscribe error'));
    })

    // catch anything than can go wrong
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_UNSUBSCRIBE_ERROR',
      error: err,
      info:  {
        source: `${this.module}.unsubscribe.catch`,
      },
    }, 'Rabbit mq unsubscribe error')));
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
        return Promise.reject(this.utils.createMQError({
          name: 'MQ_PUBLISH_REJECTED',
          info: {
            source: `${this.module}.publish`,
          },
        }, 'Rabbit mq publish error'));
      })

      // catch anything than can go wrong
      .catch(err => Promise.reject(this.utils.createMQError({
        name:  'MQ_PUBLISH_ERROR',
        error: err,
        info:  {
          source: `${this.module}.publish.catch`,
        },
      }, 'Rabbit mq publish error')));
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
      .catch(err => Promise.reject(this.utils.createMQError({
        name:  'MQ_SETUP_CHANNEL_ERROR',
        error: err,
        info:  {
          source: `${this.module}.setupChannel.catch`,
        },
      }, 'Rabbit mq setup channel error')));
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
        const computedOptions = {
          exclusive:  request.options.exclusive,
          durable:    request.options.durable,
          autoDelete: request.options.autodelete,
        };
        return Promise.resolve({
          channel:      ch,
          queueOptions: this.extend(computedOptions, this.connection.queueDefaultOptions),
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
      .catch(err => Promise.reject(this.utils.createMQError({
        name:  'MQ_SUBSCRIBE_ERROR',
        error: err,
        info:  {
          source: `${this.module}.setupSubscribe.catch`,
        },
      }, 'Rabbit mq setup subscribe error')));
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
        return Promise.reject(this.utils.createMQError({
          name:  'MQ_CONNECT_ERROR',
          error: err,
          info:  {
            source: `${this.module}.connect.catch`,
          },
        }, 'Rabbit mq connection error'));
      });
  }

}

/**
 * MQ JSON Serializer dependency validator
 * @param  {MQJSONSerializerDependency} di dependencies required for MQ JSON Serializer
 * @return {MQJSONSerializer}    instance of MQJSONSerializer
 */
const getConnector = di => Reflect.construct(
  RabbitMQ,
  [
    di.utils.validateConstructorDependencies({
      name:  'RabbitMQ',
      rules: [
        { name: 'moduleName', required: true },
        { name: 'connURI', required: true },
        { name: 'mqLib', required: true },
        { name: 'exchangeName', required: true },
        { name: 'exchangeOptions', required: true },
        { name: 'publishTTL', required: true },
      ],
      di,
    }),
  ]);

module.exports = {
  RabbitMQ,
  getConnector,
};
