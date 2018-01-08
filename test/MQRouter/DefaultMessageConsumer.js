'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  topic,
  exchange,
  mqURI,
  name,
  testingError,
  testingResponseMessage,
} = require('./Fixtures');

describe('DefaultMessageConsumer', () => {
  let testRouter;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    done();
  });

  afterEach(async () => {
    await testRouter.close();
    sandbox.restore();
  });

  it('Should reject for invalid no handler', () => {
    const errorCollector = sandbox.spy();
    testRouter = Reflect.construct(MQRouter, [{
      errorCollector,
      name,
      queue,
      mqURI,
    }]);
    return testRouter.defaultMessageConsumer({
      message: testingResponseMessage,
      queue,
      topic,
      exchange,
    })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error).to.have.property('name', 'MQ_ROUTER_OWN_HANDLER');

        expect(errorCollector.callCount).to.be.equal(1);
        expect(errorCollector.getCall(0).args).to.be.eql([{
          error,
          message: testingResponseMessage,
          queue,
          topic,
          exchange,
        }]);
        return Promise.resolve();
      });
  });

  it('Should with default handler error', () => {
    const defaultHandler = sandbox.stub().rejects(testingError);
    testRouter = Reflect.construct(MQRouter, [{
      defaultHandler,
      name,
      queue,
      mqURI,
    }]);

    return testRouter.defaultMessageConsumer({
      message: testingResponseMessage,
      queue,
      topic,
      exchange,
    })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(defaultHandler.callCount).to.be.equal(1);
        expect(defaultHandler.getCall(0).args).to.be.eql([{
          message: testingResponseMessage.message,
          queue,
          topic,
          exchange,
        }]);
        return Promise.resolve();
      });
  });

  it('Should resolve with true', () => {
    const defaultHandler = sandbox.stub().resolves({ message: testingResponseMessage });
    testRouter = Reflect.construct(MQRouter, [{
      defaultHandler,
      name,
      queue,
      mqURI,
    }]);
    const respondToRequestStub = sandbox.stub(testRouter, 'respondToRequest').resolves();

    return testRouter.defaultMessageConsumer({
      message: testingResponseMessage,
      queue,
      topic,
      exchange,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(true);
        expect(respondToRequestStub.callCount).to.be.equal(1);
        expect(respondToRequestStub.getCall(0).args).to.be.eql([{
          message:     testingResponseMessage,
          replyTo:     testingResponseMessage.id,
          destination: testingResponseMessage.replyOn,
        }]);
        return Promise.resolve();
      });
  });
});
