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

  it('Should successfully unsubscribe from channel', () => {
    const cTagTest = randomId(30);
    sandbox.stub(testRouter.connector, 'subscribe')
      .resolves({
        queue:       dummyQueue,
        consumerTag: cTagTest,
      });

    sandbox.stub(testRouter.connector, 'unsubscribe')
      .resolves(true);

    return testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
      topic:   dummyTopic,
      exchange,
    })
      .should.be.fulfilled
      .then(() => testRouter.unsubscribe({
        queue: dummyQueue,
        topic: dummyTopic,
        exchange,
      })
        .should.be.fulfilled
        .then((success) => {
          expect(success).to.be.eql(true);
        }));
  });

  it('Should fail on unregistered queue', () => {
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerRefsByProperties').throws(new Error(''));

    return testRouter.unsubscribe({
      queue: dummyQueue,
      topic: dummyTopic,
      exchange,
    })
      .should.be.rejected
      .then((error) => {
        expect(error.name).to.be.eql('MQ_ROUTER_UNSUBSCRIBE');
      });
  });
});
