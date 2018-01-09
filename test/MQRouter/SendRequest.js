'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingError,
  sendMessageDummy,
  sendMessageWithTTL,
  sendMessageWithVersion,
} = require('./Fixtures');

describe('SendRequest', () => {
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

  it('Should return specific error', () => {
    sandbox.stub(testRouter, 'checkIfIsSelfSubscribedForResponses').rejects(testingError);
    return testRouter.sendRequest(sendMessageDummy)
      .should.be.rejected
      .then((error) => {
        expect(error).to.have.property('name', 'MQ_ROUTER_SEND_REQUEST_ERROR');
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');
        return Promise.resolve();
      });
  });

  it('Should call checkIfIsSelfSubscribedForResponses only once', () => {
    const checkStub = sandbox.stub(testRouter, 'checkIfIsSelfSubscribedForResponses')
      .rejects(testingError);
    return testRouter.sendRequest(sendMessageDummy)
      .should.be.rejected
      .then(() => {
        expect(checkStub.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with default parameters', () => {
    sandbox.stub(testRouter, 'checkIfIsSelfSubscribedForResponses').resolves();
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendRequest(sendMessageDummy)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageDummy, {
            options:   {},
            version:   testRouter.mqDefaultMessageVersion,
            isRequest: true,
          }),
        ]);
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with provided options', () => {
    sandbox.stub(testRouter, 'checkIfIsSelfSubscribedForResponses').resolves();
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendRequest(sendMessageWithTTL)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageWithTTL, {
            version:   testRouter.mqDefaultMessageVersion,
            isRequest: true,
          }),
        ]);
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with provided version', () => {
    sandbox.stub(testRouter, 'checkIfIsSelfSubscribedForResponses').resolves();
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendRequest(sendMessageWithVersion)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageWithVersion, {
            options:   {},
            isRequest: true,
          }),
        ]);
        return Promise.resolve();
      });
  });
});
