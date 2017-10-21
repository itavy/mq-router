'use strict';

const { expect, getSinonSandbox } = require('@itavy/test-utilities');
const { IError } = require('@itavy/ierror');
const { MQRouter } = require('../../');
const {
  queue,
  mqURI,
  name,
} = require('./Fixtures');

describe('ValidateDestination', () => {
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

  it('Should throw expected error', () => testRouter.validateDestination()
    .should.be.rejected
    .then((error) => {
      expect(error).to.be.instanceof(IError);
      expect(error).to.have.property('name', 'MQ_ROUTER_VALIDATE_DESTINATION');
      return Promise.resolve();
    }));

  it('Should throw expected error for empty queue', () =>
    testRouter.validateDestination({ queue: '' })
      .should.be.rejected
      .then((error) => {
        expect(error).to.be.instanceof(IError);
        expect(error).to.have.property('name', 'MQ_ROUTER_VALIDATE_DESTINATION');
        return Promise.resolve();
      }));

  it('Should resolve for valid queue', () =>
    testRouter.validateDestination({ queue: 'testingQueue' })
      .should.be.fulfilled
      .then(() => Promise.resolve()));
});
