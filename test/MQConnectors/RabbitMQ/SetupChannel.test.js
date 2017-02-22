'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const sinon = require('@itavy/test-utilities').getSinon();
const utils = require('@itavy/utilities').getUtilities();
const rabbitMqLib = require('../../../lib/Connectors/RabbitMQ');
const errors = require('../../../lib/Errors');
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
        errors,
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
  sandbox.stub(testConnector.connection.instance, 'createConfirmChannel')
    .rejects(fixtures.genericMqError);

  testConnector.setupChannel({})
    .should.be.rejected
    .then((errorCreateChannel) => {
      expect(errorCreateChannel.name).to.be.equal(errors.MQ_RABBITMQ_SETUP_CHANNEL_ERROR.name);
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
        testConnector.connection.exchange.name,
        'topic',
        testConnector.connection.exchange.options,
      ]);
      expect(ch).to.be.equal(fixtures.mqChannel);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});
