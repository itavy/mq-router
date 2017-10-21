'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQMessageV1 } = require('@itavy/mq-structure');
const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingError,
  bufferedMessageConsumer,
  testingMessage: {
    replyTo,
    to,
    message,
  },
} = require('./Fixtures');

describe('BuildRequest', () => {
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

  it('Should throw expected error', () => testRouter.buildRequest({ message: {} })
    .should.be.rejected
    .then((error) => {
      expect(error).to.be.instanceof(IError);
      expect(error).to.have.property('name', 'MQ_ROUTER_BUILD_REQUEST_NO_BUFFER');
      return Promise.resolve();
    }));

  it('Should get message id', () => {
    const getIdStub = sandbox.stub(testRouter, 'getMessageId').throws(testingError);
    return testRouter.buildRequest({ message: bufferedMessageConsumer })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.eql(testingError);
        expect(getIdStub.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should call structure builder with specific args', () => {
    const generateIdSpy = sandbox.spy(testRouter, 'getMessageId');
    const testStub = sandbox.stub(testRouter.mqMessage, 'from').rejects(testingError);

    return testRouter.buildRequest({
      version: MQMessageV1,
      replyTo,
      to,
      message,
    })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(testStub.callCount).to.be.equal(1);
        expect(testStub.getCall(0).args).to.be.eql([{
          id:      generateIdSpy.returnValues[0],
          replyOn: testRouter.returnDestination,
          from:    testRouter.identification.name,
          replyTo,
          to,
          message,
        }, MQMessageV1]);

        return Promise.resolve();
      });
  });

  it('Should return a buffer and message id for the message', () => {
    const generateIdSpy = sandbox.spy(testRouter, 'getMessageId');
    return testRouter.buildRequest({
      version: MQMessageV1,
      replyTo,
      to,
      message,
    })
      .should.be.fulfilled
      .then(({ message: responseMessage, id: responseId }) => {
        expect(responseId).to.be.equal(generateIdSpy.returnValues[0]);
        expect(responseMessage).to.be.instanceOf(Buffer);
        return Promise.resolve();
      });
  });
});
