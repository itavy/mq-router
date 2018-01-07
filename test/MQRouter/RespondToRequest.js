'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQMessageV1 } = require('@itavy/mq-structure');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingMessage: {
    replyTo,
    destination,
  },
  testingError,
  bufferedMessageConsumer,
} = require('./Fixtures');

describe('RespondToRequest', () => {
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

  it('Should resolve with true for null message', () =>
    testRouter.respondToRequest({
      message: null,
      version: MQMessageV1,
      replyTo,
      destination,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(true);
        return Promise.resolve();
      }));

  it('Should forward request to sendMQMsg for non null message', () => {
    const sendMQMsgStub = sandbox.stub(testRouter, 'sendMQMsg').rejects(testingError);
    return testRouter.respondToRequest({
      message: bufferedMessageConsumer,
      version: MQMessageV1,
      replyTo,
      destination,
    })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        expect(sendMQMsgStub.callCount).to.be.equal(1);
        expect(sendMQMsgStub.getCall(0).args).to.be.eql([{
          isRequest: false,
          message:   bufferedMessageConsumer,
          version:   MQMessageV1,
          replyTo,
          destination,
        }]);
        return Promise.resolve();
      });
  });
});
