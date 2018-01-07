'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  consumeMessage,
  mqURI,
  name,
  mqTestingMessage,
  MQMessageV1,
} = require('./Fixtures');

describe('ConsumeMessages', () => {
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
  afterEach((done) => {
    clearInterval(testRouter.requestsRoutingTable.checkIntervalId);
    sandbox.restore();
    done();
  });

  it('Should reject with unknown message', () => {
    sandbox.stub(testRouter.mqMessage, 'from').returns(null);
    return testRouter.consumeMessages(consumeMessage)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error).to.have.property('name', 'MQ_ROUTER_CONSUME_ERROR');
        expect(error.cause).to.have.property('name', 'MQ_ROUTER_UNKNOWN_MESSAGE_TYPE');
        return Promise.resolve();
      });
  });

  it('Should route apropiate message', () => {
    const routeStub = sandbox.stub(testRouter, 'routeMessage').resolves();
    return testRouter.consumeMessages(consumeMessage)
      .should.be.fulfilled
      .then(() => {
        expect(routeStub.callCount).to.be.equal(1);
        expect(routeStub.getCall(0).args[0]).to.be.eql({
          message:     mqTestingMessage,
          queue:       consumeMessage.queue,
          topic:       consumeMessage.topic,
          exchange:    consumeMessage.exchange,
          consumerTag: consumeMessage.consumerTag,
          version:     MQMessageV1,
        });
      });
  });
});
