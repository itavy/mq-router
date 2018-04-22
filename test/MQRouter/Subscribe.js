'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const { IError } = require('@itavy/ierror');
const {
  queue,
  mqURI,
  name,
  testingError,
  dummyQueue,
  dummyTopic,
  exchange,
  randomId,
} = require('./Fixtures');

describe('Subscribe', () => {
  let testRouter;
  let dummyResolveHandler;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      mqURI,
    }]);
    dummyResolveHandler = sandbox.mock().resolves();
    done();
  });

  afterEach(async () => {
    await testRouter.close();
    sandbox.restore();
  });

  it('Should return specific error in case of error', () => {
    sandbox.stub(testRouter.queuesRoutingTable, 'register').throws(testingError);

    return testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
    })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error.name).to.be.equal('MQ_ROUTER_SUBSCRIBE');
        expect(error.cause.message).to.be.equal(testingError.message);
        return Promise.resolve();
      });
  });

  it('Should call register with default parameters', () => {
    const qRegisterStub = sandbox.stub(testRouter.queuesRoutingTable, 'register')
      .throws(testingError);

    return testRouter.subscribe({
      handler: dummyResolveHandler,
    })
      .should.be.rejected
      .then(() => {
        expect(qRegisterStub.callCount).to.be.equal(1);
        expect(qRegisterStub.getCall(0).args).to.be.eql([
          {
            handler:  dummyResolveHandler,
            queue:    '',
            exchange: '',
            topic:    '',
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should call register with provided parameters', () => {
    const qRegisterStub = sandbox.stub(testRouter.queuesRoutingTable, 'register')
      .throws(testingError);

    return testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
      topic:   dummyTopic,
      exchange,
    })
      .should.be.rejected
      .then(() => {
        expect(qRegisterStub.callCount).to.be.equal(1);
        expect(qRegisterStub.getCall(0).args).to.be.eql([
          {
            handler: dummyResolveHandler,
            queue:   dummyQueue,
            topic:   dummyTopic,
            exchange,
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should call connector subscribe with expected parameters', () => {
    const cRegisterStub = sandbox.stub(testRouter.connector, 'subscribe')
      .rejects(testingError);
    const dummyOptions = {
      prefetch:   false,
      autoDelete: true,
      durable:    false,
      exclusive:  false,
    };

    return testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
      topic:   dummyTopic,
      options: dummyOptions,
      exchange,
    })
      .should.be.rejected
      .then(() => {
        expect(cRegisterStub.callCount).to.be.equal(1);
        const connArgs = cRegisterStub.getCall(0).args[0];
        expect(connArgs).to.have.property('queue', dummyQueue);
        expect(connArgs).to.have.property('topic', dummyTopic);
        expect(connArgs).to.have.property('options');
        expect(connArgs.options).to.be.eql(dummyOptions);
        expect(connArgs).to.have.property('exchange', exchange);
        expect(connArgs).to.have.property('consumer');
        expect(connArgs.consumer).to.be.instanceOf(Function);
        return Promise.resolve();
      });
  });

  it('Should update queue routing table with appropriate info', () => {
    const qTest = randomId(30);
    const cTagTest = randomId(30);
    sandbox.stub(testRouter.connector, 'subscribe')
      .resolves({
        queue:       qTest,
        consumerTag: cTagTest,
      });
    const qrRegisterSpy = sandbox.spy(testRouter.queuesRoutingTable, 'register');

    const updateStub = sandbox.stub(testRouter.queuesRoutingTable, 'update')
      .throws(testingError);

    return testRouter.subscribe({
      handler: dummyResolveHandler,
    })
      .should.be.rejected
      .then(() => {
        const { index } = qrRegisterSpy.returnValues[0];
        expect(updateStub.callCount).to.be.equal(1);
        expect(updateStub.getCall(0).args).to.be.eql([
          {
            queue:       qTest,
            consumerTag: cTagTest,
            index,
          },
        ]);
        return Promise.resolve();
      });
  });

  it('Should return subscription info for random queue', () => {
    const qTest = randomId(30);
    const cTagTest = randomId(30);
    sandbox.stub(testRouter.connector, 'subscribe')
      .resolves({
        queue:       qTest,
        consumerTag: cTagTest,
      });

    return testRouter.subscribe({
      handler: dummyResolveHandler,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.eql({
          queue:    qTest,
          topic:    '',
          exchange: '',
        });
      });
  });

  it('Should return subscription info for provided parameters', () => {
    const cTagTest = randomId(30);
    sandbox.stub(testRouter.connector, 'subscribe')
      .resolves({
        queue:       dummyQueue,
        consumerTag: cTagTest,
      });

    return testRouter.subscribe({
      handler: dummyResolveHandler,
      queue:   dummyQueue,
      topic:   dummyTopic,
      exchange,
    })
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.eql({
          queue: dummyQueue,
          topic: dummyTopic,
          exchange,
        });
      });
  });
});
