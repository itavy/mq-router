'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  dummyQueue,
  dummyTopic,
  exchange,
  randomId,
} = require('./Fixtures');

describe('Unsubscribe', () => {
  let testRouter;
  let dummyResolveHandler;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      mqURI,
    }]);
    dummyResolveHandler = sandbox.mock().resolves();
    done();
  });

  afterEach(async () => {
    await testRouter.close();
    sandbox.restore();
  });

  it('Should successfully unsubscribe from channel and return true', (done) => {
    const cTagTest = randomId(30);
    const cIndexTest = randomId(30);
    sandbox.stub(testRouter.connector, 'subscribe')
      .resolves({
        queue:       dummyQueue,
        consumerTag: cTagTest,
      });

    const qrHandlerRefsSpy = sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerRefsByProperties')
      .returns({
        index:       cIndexTest,
        consumerTag: cTagTest,
      });

    const connectorUnsubscribeSpy = sandbox.stub(testRouter.connector, 'unsubscribe')
      .resolves(true);

    sandbox.stub(testRouter.queuesRoutingTable, 'unregister')
      .returns(true);

    testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
      topic:   dummyTopic,
      exchange,
    })
      .then(() => testRouter.unsubscribe({
        queue: dummyQueue,
        topic: dummyTopic,
        exchange,
      })
        .should.be.fulfilled
        .then((result) => {
          expect(qrHandlerRefsSpy.callCount).to.be.eql(1);
          expect(connectorUnsubscribeSpy.callCount).to.be.eql(1);
          expect(result).to.be.eql(true);
          done();
        }));
  });

  it('Should not unsubscribe on unregistered queue and return false', (done) => {
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerRefsByProperties')
      .returns({
        index:       null,
        consumerTag: null,
      });

    testRouter.unsubscribe({
      queue: dummyQueue,
      topic: dummyTopic,
      exchange,
    })
      .should.be.fulfilled
      .then((result) => {
        expect(result).to.be.eql(false);
        done();
      });
  });

  it('Should fail on not subscribed queue', (done) => {
    const cTagTest = randomId(30);
    const cIndexTest = randomId(30);

    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerRefsByProperties')
      .returns({
        index:       cIndexTest,
        consumerTag: cTagTest,
      });

    const connectorUnsubscribeSpy = sandbox.stub(testRouter.connector, 'unsubscribe')
      .throws(new Error('test'));

    testRouter.unsubscribe({
      queue: dummyQueue,
      topic: dummyTopic,
      exchange,
    })
      .should.be.rejected
      .then((error) => {
        expect(connectorUnsubscribeSpy.callCount).to.be.eql(1);
        expect(error.name).to.be.eql('MQ_ROUTER_UNSUBSCRIBE');
        expect(error.cause.message).to.be.eql('test');
        done();
      });
  });
});
