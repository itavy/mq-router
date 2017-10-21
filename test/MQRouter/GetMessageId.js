'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
} = require('./Fixtures');

describe('GetMessageId', () => {
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

  it('Should return an id', (done) => {
    const id = testRouter.getMessageId();
    expect(id).to.be.a('string');
    expect(id.length > name.length).to.be.equal(true);
    done();
  });

  it('Should return different ids', (done) => {
    const id1 = testRouter.getMessageId();
    const id2 = testRouter.getMessageId();
    expect(id1).to.not.be.equal(id2);
    done();
  });
});
