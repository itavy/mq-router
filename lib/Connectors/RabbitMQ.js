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
      mqLib:      di.mqLib,
      instance:   null,
      uri:        di.connURI,
      connecting: false,
      exchange:   {
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
    };
  }
  /**
   * Subscribe
   * @param {module:MQRouter/Connectors~MQSubscribeDefinition} queueDefinition
   * queue subscribe definition
   * @returns {Promise} returns nothing on success
   * @public
   */
  subscribe(queueDefinition) {
    return this.setupSubscribe(queueDefinition)
      // setup listen handler
      .then(queueSetup => (queueSetup.channel.consume(queueSetup.queue, message => (
        queueDefinition.handler({
          message: message.content,
          rkey:    message.fields.routingKey,
          // @TODO extend ack to respond with publish if supplied
          ack:     () => queueSetup.channel.ack(message),
          nack:    () => queueSetup.channel.nack(message),
        })
      ), { noAck: false })
        .then(() => Promise.resolve())
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
   * Unsubscribe
   * @returns {Promise} return on success
   * @public
   */
  unsubscribe() {
    return `unsubscribe ${this.module}`;
  }
  /**
   * Unsubscribe
   * @returns {Promise} return on success
   * @public
   */
  publish() {
    return `publish ${this.module}`;
  }

  /**
   * all rabbitmq low level specific stuff
   * @param {module:MQRouter/Connectors~MQSubscribeDefinition} queueDefinition
   * queue subscribe definition
   * @return {Promise} resolves with channel and queue
   * @private
   */
  setupSubscribe(queueDefinition) {
    return this.getConnection()
      // create confirm channel
      .then(connection => connection.createConfirmChannel())
      // setup message limit if required
      // don't use global flag since it will break connection on rabbitmq
      // older than v3.3.0 @see http://www.squaremobius.net/amqp.node/channel_api.html#channel_prefetch
      .then(ch => (ch.prefetch(queueDefinition.limit || 0)
        .then(() => Promise.resolve(ch))
      ))
      // assert exchange if exists with provided options
      .then(ch => (ch.assertExchange(this.connection.exchangeName, 'topic', this.connection.exchangeOptions)
        .then(() => Promise.resolve(ch))
      ))
      // map explicit the received options;
      // if the general definition of options will change then
      // only here will be needed to touch
      .then((ch) => {
        const computedOptions = {
          exclusive:  queueDefinition.options.exclusive,
          durable:    queueDefinition.options.durable,
          autoDelete: queueDefinition.options.autodelete,
        };
        return Promise.resolve({
          channel:      ch,
          queueOptions: this.extend(computedOptions, this.connection.queueDefaultOptions),
        });
      })
      // assert queue with computed options
      .then(ch => (ch.channel.assertQueue(queueDefinition.name || '', ch.queueOptions)
        .then(q => Promise.resolve({
          channel: ch.channel,
          queue:   q,
        }))
      ))
      // bind queue to routing keys
      // to check if it will fail if it is allready binded
      .then(ch => (
        ch.channel.bindQueue(ch.queue.queue, this.connection.exchangeName, queueDefinition.rkey)
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
   * Get rabbitmqConnection
   * @return {Promise} resolves with conenction
   * @private
   */
  getConnection() {
    return new Promise((resolve) => {
      if (null === this.connection.instance) {
        return this.connect()
          .then(() => resolve(this.connection.instance));
      }
      return resolve(this.connection.instance);
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_CONNECTION_ERROR',
      error: err,
      info:  {
        source: `${this.module}.getConnection.catch`,
      },
    }, 'Rabbit mq getConnection error')));
  }

  /**
   * Connect to rabbitmq server
   * @return {Promise} return nothing on success
   * @private
   */
  connect() {
    if (true === this.connection.connecting) {
      return this.waitForConnection();
    }
    this.connection.connecting = true;
    return this.connection.mqLib.connect(this.connection.connURI)
      .then((mqConn) => {
        this.connection.instance = mqConn;
        this.connection.connecting = false;
        return Promise.resolve();
      })
      .catch((err) => {
        this.connection.instance = -1;
        return Promise.reject(this.utils.createMQError({
          name:  'MQ_CONNECTION_ERROR',
          error: err,
          info:  {
            source: `${this.module}.connect.catch`,
          },
        }, 'Rabbit mq connection error'));
      });
  }

  /**
   * Loop for connection until it becomes available
   * @return {Promise} return nothing on success
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const evaluateConenction = () => { // eslint-disable-line require-jsdoc, consistent-return
        if (-1 === this.connetion) {
          return reject();
        }
        if (null !== this.connection) {
          return resolve();
        }
        setTimeout(evaluateConenction, 100);
      };
      evaluateConenction();
    })
    .catch(err => Promise.reject(this.utils.createMQError({
      name:  'MQ_CONNECTION_ERROR',
      error: err,
      info:  {
        source: `${this.module}.waitForConnection.catch`,
      },
    }, 'Rabbit mq connection error')));
  }

}

/**
 * MQ JSON Serializer dependency validator
 * @param  {MQJSONSerializerDependency} di dependencies required for MQ JSON Serializer
 * @return {MQJSONSerializer}    instance of MQJSONSerializer
 */
const getConnector = di => new RabbitMQ(di.utils.validateConstructorDependencies({
  name:  'RabbitMQ',
  rules: [
    { name: 'moduleName', required: true },
    { name: 'connURI', required: true },
    { name: 'mqLib', required: true },
    { name: 'exchangeName', required: true },
    { name: 'exchangeOptions', required: true },
  ],
  di,
}));

module.exports = {
  RabbitMQ,
  getConnector,
};
