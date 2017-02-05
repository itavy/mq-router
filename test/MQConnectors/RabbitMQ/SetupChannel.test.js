'use strict';

const expect = require('../../testHelpers').getExpect();
const sinon = require('../../testHelpers').getSinon();
const utils = require('../../../lib/utilities').getUtilities();
const rabbitMqLib = require('../../../lib/Connectors/RabbitMQ');
const fixtures = require('./Fixtures');

let sandbox = null;
let testConnector = null;


beforeEach((done) => {
  sandbox = sinon.sandbox.create();
  testConnector = rabbitMqLib.getConnector({
    moduleName:      fixtures.moduleName,
    connURI:         fixtures.mqConnUri,
    mqLib:           fixtures.mqLib,
    exchangeName:    fixtures.exchangeName,
    exchangeOptions: fixtures.exchangeOptions,
    publishTTL:      fixtures.publishTTL,
    utils,
  });
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
  sandbox.stub(testConnector.connection.instance, 'createConfirmChannel')
    .rejects(fixtures.genericMqError);

  testConnector.setupChannel({})
    .should.be.rejected
    .then((errorCreateChannel) => {
      expect(errorCreateChannel.name).to.be.equal('MQ_RABBITMQ_SETUP_CHANNEL_ERROR');
      expect(errorCreateChannel.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should set prefetch 0 if not specified', (done) => {
  const prefetchSpy = sandbox.spy(fixtures.mqChannel, 'prefetch');

  testConnector.setupChannel({})
    .then(() => {
      expect(prefetchSpy.callCount).to.be.equal(1);
      expect(prefetchSpy.getCall(0).args).to.be.eql([0]);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should set prefetch to provided request', (done) => {
  const prefetchSpy = sandbox.spy(fixtures.mqChannel, 'prefetch');
  const setupChannelRequest = {
    limit: 216,
  };

  testConnector.setupChannel(setupChannelRequest)
    .then(() => {
      expect(prefetchSpy.callCount).to.be.equal(1);
      expect(prefetchSpy.getCall(0).args).to.be.eql([setupChannelRequest.limit]);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('Should assert exchange existance and return created channel ', (done) => {
  const assertExchangeSpy = sandbox.spy(fixtures.mqChannel, 'assertExchange');

  testConnector.setupChannel({})
    .then((ch) => {
      expect(assertExchangeSpy.callCount).to.be.equal(1);
      expect(assertExchangeSpy.getCall(0).args).to.be.eql([
        testConnector.connection.exchangeName,
        'topic',
        testConnector.connection.exchangeOptions,
      ]);
      expect(ch).to.be.equal(fixtures.mqChannel);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});
