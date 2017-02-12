'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const utils = require('@itavy/utilities').getUtilities();
const rabbitMqLib = require('../../../lib/Connectors/RabbitMQ');
const fixtures = require('./Fixtures');

it('Should export required info', (done) => {
  expect(Object.keys(rabbitMqLib).length).to.equal(1);
  expect(rabbitMqLib).to.have.property('RabbitMQ');

  done();
});

it('Should return an instance of RabbitMQ connector', (done) => {
  const testConnector = Reflect.construct(
    rabbitMqLib.RabbitMQ,
    [
      {
        connURI:         fixtures.mqConnUri,
        mqLib:           fixtures.mqLib,
        exchangeName:    fixtures.exchangeName,
        exchangeOptions: fixtures.exchangeOptions,
        publishTTL:      fixtures.publishTTL,
        utils,
      },
    ]);
  expect(testConnector).to.be.instanceof(rabbitMqLib.RabbitMQ);
  done();
});

it('Should have expected properties', (done) => {
  const testConnector = Reflect.construct(
    rabbitMqLib.RabbitMQ,
    [
      {
        connURI:         fixtures.mqConnUri,
        mqLib:           fixtures.mqLib,
        exchangeName:    fixtures.exchangeName,
        exchangeOptions: fixtures.exchangeOptions,
        publishTTL:      fixtures.publishTTL,
        utils,
      },
    ]);
  [
    'connect',
    'setupSubscribe',
    'setupChannel',
    'publish',
    'unsubscribe',
    'subscribe',
    'start',
  ].forEach(funcName => expect(testConnector).to.have.property(funcName).that.is.a('function'));
  done();
});
