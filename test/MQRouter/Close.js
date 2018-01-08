'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');

const {
  queue,
  mqURI,
  name,
} = require('./Fixtures');


describe('Close', () => {
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
    sandbox.restore();
    done();
  });

  it('Should clear requestsTable timer', () => {
    const requestsRoutingTableSpy = sandbox.spy(testRouter.requestsRoutingTable, 'close');
    return testRouter.close()
      .should.be.fulfilled
      .then(() => {
        expect(requestsRoutingTableSpy.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });

  it('Should close connections', () => {
    const connectionSpy = sandbox.spy(testRouter.connector, 'close');
    return testRouter.close()
      .should.be.fulfilled
      .then(() => {
        expect(connectionSpy.callCount).to.be.equal(1);
        return Promise.resolve();
      });
  });
});
