'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
// const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingError,
  sendMQMsgResponse,
  sendMQMsgRequest,
  sendMQMsgRequestNoTTL,
  bufferedMessageConsumer,
} = require('./Fixtures');

describe('SendMQMsg', () => {
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

  it('Should validate destination first', () => {
    const validateDestinationStub = sandbox.stub(testRouter, 'validateDestination')
      .rejects(testingError);
    return testRouter.sendMQMsg(sendMQMsgResponse)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(validateDestinationStub.callCount).to.be.equal(1);
        expect(validateDestinationStub.getCall(0).args).to.be.eql([
          sendMQMsgResponse.destination,
        ]);
        return Promise.resolve();
      });
  });

  it('Should use provided ttl for registering promise', () => {
    const registerStub = sandbox.stub(testRouter.requestsRoutingTable, 'register')
      .throws(testingError);
    return testRouter.sendMQMsg(sendMQMsgRequest)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(registerStub.callCount).to.be.equal(1);
        expect(registerStub.getCall(0).args[0].options).to.be.eql(sendMQMsgRequest.options);
        return Promise.resolve();
      });
  });

  it('Should default ttl for registering promise', () => {
    const registerStub = sandbox.stub(testRouter.requestsRoutingTable, 'register')
      .throws(testingError);
    return testRouter.sendMQMsg(sendMQMsgRequestNoTTL)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(registerStub.callCount).to.be.equal(1);
        expect(registerStub.getCall(0).args[0].options).to.be.eql({
          ttl: testRouter.defaultTTL,
        });
        return Promise.resolve();
      });
  });

  it('Should use computed id for registering promise', () => {
    const registerStub = sandbox.stub(testRouter.requestsRoutingTable, 'register')
      .throws(testingError);
    const buildRequestSpy = sandbox.spy(testRouter, 'buildRequest');
    return testRouter.sendMQMsg(sendMQMsgRequestNoTTL)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        return buildRequestSpy.getCall(0).returnValue;
      })
      .then(({ id }) => {
        expect(registerStub.getCall(0).args[0].id).to.be.equal(id);
        return Promise.resolve();
      });
  });

  it('Should send serialized message to connector', () => {
    const sendMessageStub = sandbox.stub(testRouter.connector, 'sendMessage')
      .rejects(testingError);
    const buildRequestSpy = sandbox.spy(testRouter, 'buildRequest');
    return testRouter.sendMQMsg(sendMQMsgResponse)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        return buildRequestSpy.getCall(0).returnValue;
      })
      .then(({ message: serializedMessage }) => {
        expect(sendMessageStub.getCall(0).args).to.be.eql([
          Object.assign(
            {},
            sendMQMsgResponse.destination,
            {
              message: serializedMessage,
              options: sendMQMsgResponse.options,
            }
          ),
        ]);
        return Promise.resolve();
      });
  });

  it('Should call requests routing table with request id for error', () => {
    const sendError = Error('sendError');
    sandbox.stub(testRouter.connector, 'sendMessage').rejects(sendError);

    const callByIdStub = sandbox.stub(testRouter.requestsRoutingTable, 'callById')
      .throws(testingError);
    const buildRequestSpy = sandbox.spy(testRouter, 'buildRequest');

    return testRouter.sendMQMsg(sendMQMsgRequest)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        return buildRequestSpy.getCall(0).returnValue;
      })
      .then(({ id }) => {
        expect(callByIdStub.callCount).to.be.equal(1);
        expect(callByIdStub.getCall(0).args).to.be.eql([
          {
            error: sendError,
            id,
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should return rejected promise', () => {
    sandbox.stub(testRouter.connector, 'sendMessage').rejects(testingError);

    return testRouter.sendMQMsg(sendMQMsgRequest)
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        return Promise.resolve();
      });
  });

  it('Should return registered promise', () => {
    sandbox.stub(testRouter.connector, 'sendMessage').resolves();
    const registerSpy = sandbox.spy(testRouter.requestsRoutingTable, 'register');
    const buildRequestSpy = sandbox.spy(testRouter, 'buildRequest');

    setTimeout(async () => {
      const { id } = await buildRequestSpy.getCall(0).returnValue;
      testRouter.requestsRoutingTable.mqrEvents.emit(id, {
        response: bufferedMessageConsumer,
      });
    }, 30); // arbitrary delay; expect to be increased if test become unstable

    const p = testRouter.sendMQMsg(sendMQMsgRequest);
    return p
      .should.be.fulfilled
      .then(async (response) => {
        const registerResponse = await registerSpy.getCall(0).returnValue;
        expect(response).to.be.eql(registerResponse);
        return Promise.resolve();
      });
  });
});
