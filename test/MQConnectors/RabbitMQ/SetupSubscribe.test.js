'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const sinon = require('@itavy/test-utilities').getSinon();
const utils = require('@itavy/utilities').getUtilities();
const rabbitMqLib = require('../../../lib/Connectors/RabbitMQ');
const fixtures = require('./Fixtures');

let sandbox = null;
let testConnector = null;


beforeEach((done) => {
  sandbox = sinon.sandbox.create();
  testConnector = Reflect.construct(
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
  testConnector.connect()
    .then(done)
    .catch(err => done(err));
});

afterEach((done) => {
  sandbox.restore();
  sandbox = null;
  done();
});

it('should reject with expected error', (done) => {
  sandbox.stub(testConnector, 'setupChannel')
    .rejects(fixtures.genericMqError);

  testConnector.setupSubscribe({})
    .should.be.rejected
    .then((errSetupSubscribe) => {
      expect(errSetupSubscribe.name).to.be.equal('MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR');
      expect(errSetupSubscribe.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should assert queue with default parameters', (done) => {
  const assertQueue = sandbox.stub(fixtures.mqChannel, 'assertQueue')
    .rejects(fixtures.genericMqError);

  testConnector.setupSubscribe({})
    .should.be.rejected
    .then((errSetupSubscribe) => {
      // ensure we receive our error and not from other source
      expect(errSetupSubscribe.name).to.be.equal('MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR');
      expect(errSetupSubscribe.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(() => {
      expect(assertQueue.callCount).to.be.equal(1);
      expect(assertQueue.getCall(0).args[0]).to.be.equal('');
      expect(assertQueue.getCall(0).args[1]).to.be.eql(
        testConnector.connection.queueDefaultOptions);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should assert queue with provided parameters', (done) => {
  const assertQueue = sandbox.stub(fixtures.mqChannel, 'assertQueue')
    .rejects(fixtures.genericMqError);

  testConnector.setupSubscribe({
    name:    fixtures.queueName,
    options: fixtures.queueParameters,
  })
    .should.be.rejected
    .then((errSetupSubscribe) => {
      // ensure we receive our error and not from other source
      expect(errSetupSubscribe.name).to.be.equal('MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR');
      expect(errSetupSubscribe.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(() => {
      expect(assertQueue.callCount).to.be.equal(1);
      expect(assertQueue.getCall(0).args[0]).to.be.equal(fixtures.queueName);
      expect(assertQueue.getCall(0).args[1]).to.be.eql(fixtures.queueParameters);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should bind the queue to provided routing key', (done) => {
  const bindQueue = sandbox.stub(fixtures.mqChannel, 'bindQueue')
    .rejects(fixtures.genericMqError);

  testConnector.setupSubscribe({
    name: fixtures.subscribedQueue.queue,
    rkey: fixtures.subscribedRoutingKey,
  })
    .should.be.rejected
    .then((errSetupSubscribe) => {
      // ensure we receive our error and not from other source
      expect(errSetupSubscribe.name).to.be.equal('MQ_RABBITMQ_SETUP_SUBSCRIBE_ERROR');
      expect(errSetupSubscribe.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(() => {
      expect(bindQueue.callCount).to.be.equal(1);
      expect(bindQueue.getCall(0).args[0]).to.be.eql(fixtures.subscribedQueue.queue);
      expect(bindQueue.getCall(0).args[1]).to.be.eql(testConnector.connection.exchangeName);
      expect(bindQueue.getCall(0).args[2]).to.be.eql(fixtures.subscribedRoutingKey);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('Should resolve with expected result', (done) => {
  testConnector.setupSubscribe({
    name: fixtures.subscribedQueue.queue,
    rkey: fixtures.subscribedRoutingKey,
  })
    .should.be.fulfilled
    .then((resp) => {
      expect(resp.channel).to.be.equal(fixtures.mqChannel);
      expect(resp.queue).to.be.equal(fixtures.subscribedQueue.queue);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});
