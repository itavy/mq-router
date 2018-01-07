'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  routeMessage,
  mqURI,
  name,
  testingError,
} = require('./Fixtures');

describe('RouteMessage', () => {
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

  it('Should reject with expected error', () => {
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerByConsumerTag')
      .rejects(testingError);
    return testRouter.routeMessage()
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error).to.have.property('name', 'MQ_ROUTER_ROUTING_ERROR');
        expect(error.cause.message).to.be.equal(testingError.message);

        return Promise.resolve();
      });
  });

  it('Should emit error event', () => {
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerByConsumerTag')
      .rejects(testingError);
    const errorSpy = sandbox.spy();

    testRouter.mqrEvents.once('error', errorSpy);
    return testRouter.routeMessage()
      .should.be.rejected
      .then((error) => {
        expect(errorSpy.callCount).to.be.equal(1);
        expect(errorSpy.getCall(0).args[0]).to.have.property('error', error);
        return Promise.resolve();
      });
  });

  it('Should get apropiate handler for provided consumer tag', () => {
    const getHandlerStub = sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerByConsumerTag')
      .rejects(testingError);

    return testRouter.routeMessage(routeMessage)
      .should.be.rejected
      .then(() => {
        expect(getHandlerStub.callCount).to.be.equal(1);
        expect(getHandlerStub.getCall(0).args[0])
          .to.have.property('consumerTag', routeMessage.consumerTag);
        return Promise.resolve();
      });
  });

  it('Should call provided handler with provided info', () => {
    const handler = sandbox.stub().rejects();
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerByConsumerTag')
      .resolves({ handler });

    return testRouter.routeMessage(routeMessage)
      .should.be.rejected
      .then(() => {
        expect(handler.callCount).to.be.equal(1);
        expect(handler.getCall(0).args[0]).to.be.eql({
          message:     routeMessage.message.message,
          queue:       routeMessage.queue,
          topic:       routeMessage.topic,
          exchange:    routeMessage.exchange,
          consumerTag: routeMessage.consumerTag,
        });
        return Promise.resolve();
      });
  });

  it('Should resolve with respondToRequest', () => {
    const handler = sandbox.stub().resolves({ message: null });
    sandbox.stub(testRouter.queuesRoutingTable, 'getHandlerByConsumerTag')
      .resolves({ handler });
    const respondToRequestSpy = sandbox.spy(testRouter, 'respondToRequest');

    return testRouter.routeMessage(routeMessage)
      .should.be.fulfilled
      .then(() => {
        expect(respondToRequestSpy.callCount).to.be.equal(1);
        expect(respondToRequestSpy.getCall(0).args[0]).to.be.eql({
          message:     null,
          replyTo:     routeMessage.message.id,
          destination: routeMessage.message.replyOn,
          version:     routeMessage.version,
        });
        return Promise.resolve();
      });
  });
});
