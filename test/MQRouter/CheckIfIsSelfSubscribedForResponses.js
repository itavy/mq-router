'use strict';

const { IError } = require('@itavy/ierror');
const { expect, getSinonSandbox } = require('@itavy/test-utilities');

const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingError,
  topic,
  exchange,
  dummyTopic,
} = require('./Fixtures');

describe('CheckIfIsSelfSubscribedForResponses', () => {
  let testRouter;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      topic,
      exchange,
      mqURI,
    }]);
    done();
  });

  afterEach(async () => {
    await testRouter.close();
    sandbox.restore();
  });

  it('Should return specific error in case of error', () => {
    sandbox.stub(testRouter, 'subscribe').rejects(testingError);
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error.name).to.be.equal('MQ_ROUTER_SELF_SUBSCRIBE');
        expect(error.cause.message).to.be.equal(testingError.message);
        return Promise.resolve();
      });
  });

  it('Should emit selfSubscribed event with approptiate error', () => {
    sandbox.stub(testRouter, 'subscribe').rejects(testingError);
    const selfSubscribedEventSpy = sandbox.spy();
    testRouter.mqrEvents.once('selfSubscribed', selfSubscribedEventSpy);
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.rejected
      .then((error) => {
        expect(selfSubscribedEventSpy.callCount).to.be.equal(1);
        expect(selfSubscribedEventSpy.getCall(0).args).to.be.eql([
          {
            error,
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should call subscribe with appropriate parameters', () => {
    const subscribeStub = sandbox.stub(testRouter, 'subscribe')
      .rejects(testingError);
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.rejected
      .then((error) => {
        expect(error.cause.message).to.be.equal(testingError.message);
        expect(subscribeStub.callCount).to.be.equal(1);
        const subscribeParams = subscribeStub.getCall(0).args[0];
        expect(subscribeParams).to.have.property('queue', queue);
        expect(subscribeParams).to.have.property('topic', topic);
        expect(subscribeParams).to.have.property('exchange', exchange);
        expect(subscribeParams).to.have.property('handler');
        expect(subscribeParams.handler).to.be.instanceOf(Function);
        return Promise.resolve();
      });
  });

  it('Should use topic response from subscribe as destination queue', () => {
    sandbox.stub(testRouter, 'subscribe').resolves({ topic: dummyTopic });
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(testRouter.returnDestination.queue).to.be.equal(dummyTopic);
        return Promise.resolve();
      });
  });

  it('Should use queue response from subscribe as destination queue', () => {
    sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(testRouter.returnDestination.queue).to.be.equal(dummyTopic);
        return Promise.resolve();
      });
  });

  it('Should mark itself as selfsubscribed', () => {
    sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(testRouter.identification.subscribed).to.be.equal(true);
        return Promise.resolve();
      });
  });

  it('Should reset flag for subscribing', () => {
    sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(testRouter.identification.subscribing).to.be.equal(false);
        return Promise.resolve();
      });
  });

  it('Should emit event for successfull subscribing', () => {
    sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });
    const selfSubscribedEventSpy = sandbox.spy();
    testRouter.mqrEvents.once('selfSubscribed', selfSubscribedEventSpy);
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(selfSubscribedEventSpy.callCount).to.be.equal(1);
        expect(selfSubscribedEventSpy.getCall(0).args).to.be.eql([
          {
            error: null,
          },
        ]);
      });
  });

  it('Should resolve if it is allready subscribed', () => {
    const subscribeStub = sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .then(() => testRouter.checkIfIsSelfSubscribedForResponses()
        .should.be.fulfilled
        .then(() => {
          expect(subscribeStub.callCount).to.be.equal(1);
          return Promise.resolve();
        }));
  });

  it('Should resolve if it is a self subscription pending', () => {
    const subscribeStub = sandbox.stub(testRouter, 'subscribe').resolves({ queue: dummyTopic });

    testRouter.checkIfIsSelfSubscribedForResponses();
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.fulfilled
      .then(() => {
        expect(subscribeStub.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should fail if pending self subscription is failing', () => {
    const subscribeStub = sandbox.stub(testRouter, 'subscribe').rejects();

    testRouter.checkIfIsSelfSubscribedForResponses()
      .catch(() => true);
    return testRouter.checkIfIsSelfSubscribedForResponses()
      .should.be.rejected
      .then(() => {
        expect(subscribeStub.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });
});
