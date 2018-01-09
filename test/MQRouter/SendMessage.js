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

describe('SendMessage', () => {
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
    sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendMessage(sendMessageDummy)
      .should.be.rejected
      .then((error) => {
        expect(error).to.have.property('name', 'MQ_ROUTER_SEND_MESSAGE_ERROR');
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with default parameters', () => {
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendMessage(sendMessageDummy)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageDummy, {
            options:   {},
            version:   testRouter.mqDefaultMessageVersion,
            isRequest: false,
          }),
        ]);
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with provided options', () => {
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendMessage(sendMessageWithTTL)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageWithTTL, {
            version:   testRouter.mqDefaultMessageVersion,
            isRequest: false,
          }),
        ]);
        return Promise.resolve();
      });
  });

  it('Should call sendMQMsg with provided version', () => {
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.sendMessage(sendMessageWithVersion)
      .should.be.rejected
      .then((error) => {
        expect(error.cause).to.have.property('message', 'MQRouterTestingError');

        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([
          Object.assign({}, sendMessageWithVersion, {
            options:   {},
            isRequest: false,
          }),
        ]);
        return Promise.resolve();
      });
  });
});
