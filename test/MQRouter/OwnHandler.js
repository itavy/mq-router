'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  topic,
  exchange,
  mqTestingRequestMessage,
  mqTestingResponseMessage,
} = require('./Fixtures');

describe('OwnHandler', () => {
  let testRouter;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      mqURI,
    }]);
    done();
  });

  afterEach(async () => {
    await testRouter.close();
    sandbox.restore();
  });

  it('Should call default consumer for request type message', () => {
    const defaultConsumerStub = sandbox.stub(testRouter, 'defaultMessageConsumer').resolves();
    return testRouter.ownHandler({
      message: mqTestingRequestMessage,
      queue,
      topic,
      exchange,
    })
      .should.be.fulfilled
      .then(() => {
        expect(defaultConsumerStub.callCount).to.be.equal(1);
        expect(defaultConsumerStub.getCall(0).args).to.be.eql([
          {
            message: mqTestingRequestMessage,
            queue,
            topic,
            exchange,
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should forward to requests routing table for response type message', () => {
    const defaultConsumerStub = sandbox.stub(testRouter.requestsRoutingTable, 'callById').resolves();
    return testRouter.ownHandler({
      message: mqTestingResponseMessage.message,
      replyTo: mqTestingResponseMessage.replyTo,
      queue,
      topic,
      exchange,
    })
      .should.be.fulfilled
      .then(() => {
        expect(defaultConsumerStub.callCount).to.be.equal(1);
        expect(defaultConsumerStub.getCall(0).args).to.be.eql([
          {
            id:      mqTestingResponseMessage.replyTo,
            message: {
              message: mqTestingRequestMessage.message,
              queue,
              topic,
              exchange,
            },
          },
        ]);
        return Promise.resolve();
      });
  });
});
