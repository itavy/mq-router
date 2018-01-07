'use strict';

const { expect } = require('@itavy/test-utilities');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
  testingError,
} = require('./Fixtures');

describe('WaitForSelfSubscription', () => {
  let testRouter;

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
  });

  it('Should reject on subscribe error', () => {
    const testWait = testRouter.waitForSelfSubscription();
    testRouter.mqrEvents.emit('selfSubscribed', { error: testingError });
    return testWait
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.equal(testingError);
        return Promise.resolve();
      });
  });

  it('Should resolve on successfull subscribing', () => {
    const testWait = testRouter.waitForSelfSubscription();
    testRouter.mqrEvents.emit('selfSubscribed', { error: null });
    return testWait
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(true);
        return Promise.resolve();
      });
  });
});
