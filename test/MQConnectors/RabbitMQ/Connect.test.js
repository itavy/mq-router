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
  testConnector = rabbitMqLib.getConnector({
    moduleName:      fixtures.moduleName,
    connURI:         fixtures.mqConnUri,
    mqLib:           fixtures.mqLib,
    exchangeName:    fixtures.exchangeName,
    exchangeOptions: fixtures.exchangeOptions,
    publishTTL:      fixtures.publishTTL,
    utils,
  });
  done();
});

afterEach((done) => {
  sandbox.restore();
  sandbox = null;
  done();
});


it('should call expected method from mqLib and set instance', (done) => {
  const connectSpy = sandbox.spy(testConnector.connection.mqLib, 'connect');

  testConnector.connect()
    .should.be.fulfilled
    .then(() => {
      expect(connectSpy.callCount).to.be.equal(1);
      expect(connectSpy.getCall(0).args).to.be.eql([fixtures.mqConnUri]);
      expect(testConnector.connection.instance).to.be.equal(fixtures.mqConnection);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});

it('should return expected error', (done) => {
  // eslint-disable-next-line no-unused-vars
  const connectStub = sandbox.stub(testConnector.connection.mqLib, 'connect')
    .rejects(fixtures.genericMqError);

  testConnector.connect()
    .should.be.rejected
    .then((errorConnect) => {
      expect(errorConnect.name).to.be.equal('MQ_RABBITMQ_CONNECT_ERROR');
      expect(errorConnect.cause()).to.be.equal(fixtures.genericMqError);
      return Promise.resolve();
    })
    .then(done)
    .catch(err => done(err));
});
