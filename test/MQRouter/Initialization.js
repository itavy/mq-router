'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const {
  MQRouter,
  RequestsRoutingTable,
  QueuesRoutingTable,
} = require('../../');
const { EventEmitter } = require('events');

const {
  queue,
  mqURI,
  name,
  testingError,
} = require('./Fixtures');


describe('Initialization', () => {
  let testRouter;
  let testQueueRouter;
  const sandbox = getSinonSandbox();

  beforeEach((done) => {
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      mqURI,
    }]);
    testQueueRouter = Reflect.construct(MQRouter, [{
      name,
      mqURI,
    }]);
    done();
  });

  afterEach((done) => {
    testRouter.requestsRoutingTable.close();
    testQueueRouter.requestsRoutingTable.close();
    sandbox.restore();
    done();
  });

  it('Should have all required properties', (done) => {
    expect(testRouter).to.have.property('connector');
    expect(testRouter).to.have.property('mqMessage');
    expect(testRouter).to.have.property('mqKnownMessages');
    expect(testRouter).to.have.property('mqDefaultMessageVersion');
    expect(testRouter).to.have.property('mqrEvents');
    expect(testRouter.mqrEvents).to.be.instanceof(EventEmitter);
    expect(testRouter).to.have.property('sourceIdentifier', `${name}.MQRouter`);
    expect(testRouter).to.have.property('requestsRoutingTable');
    expect(testRouter.requestsRoutingTable).to.be.instanceof(RequestsRoutingTable);
    expect(testRouter).to.have.property('queuesRoutingTable');
    expect(testRouter.queuesRoutingTable).to.be.instanceof(QueuesRoutingTable);
    expect(testRouter).to.have.property('mqRequestIds');
    expect(testRouter.mqRequestIds).to.be.eql([]);
    expect(testRouter).to.have.property('defaultTTL');
    expect(testRouter).to.have.property('defaultHandler');
    expect(testRouter).to.have.property('identification');
    expect(testRouter).to.have.property('returnDestination');
    done();
  });

  it('Should generate specific queue if none provided', (done) => {
    const { queue: generatedQueue } = testQueueRouter.identification.listen;
    const r = new RegExp(`${name}-\\d+`);
    expect(r.test(generatedQueue)).to.be.equal(true);
    done();
  });

  it('Should have all public methods', (done) => {
    expect(testRouter).to.respondTo('sendMessage');
    expect(testRouter).to.respondTo('sendRequest');
    expect(testRouter).to.respondTo('subscribe');
    done();
  });

  it('Should have all private methods', (done) => {
    expect(testRouter).to.respondTo('sendMQMsg');
    expect(testRouter).to.respondTo('ownHandler');
    expect(testRouter).to.respondTo('waitForSelfSubscription');
    expect(testRouter).to.respondTo('checkIfIsSelfSubscribedForResponses');
    expect(testRouter).to.respondTo('routeMessage');
    expect(testRouter).to.respondTo('consumeMessages');
    expect(testRouter).to.respondTo('respondToRequest');
    expect(testRouter).to.respondTo('defaultMessageConsumer');
    expect(testRouter).to.respondTo('buildRequest');
    expect(testRouter).to.respondTo('getMessageId');
    expect(testRouter).to.respondTo('validateDestination');
    done();
  });

  it('Should register an error collector', (done) => {
    expect(testRouter.mqrEvents.emit('error')).to.be.equal(true);
    done();
  });

  it('Should call provided error colector', (done) => {
    clearInterval(testRouter.requestsRoutingTable.checkIntervalId);

    const errorCollector = sandbox.spy();
    testRouter = Reflect.construct(MQRouter, [{
      name,
      queue,
      mqURI,
      errorCollector,
    }]);

    testRouter.mqrEvents.emit('error', testingError);

    expect(errorCollector.callCount).to.be.equal(1);
    expect(errorCollector.getCall(0).args).to.be.eql([testingError]);

    done();
  });
});
