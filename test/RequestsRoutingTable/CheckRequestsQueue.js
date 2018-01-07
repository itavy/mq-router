'use strict';

const { RequestsRoutingTable } = require('../../');
const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');
const { expect, getSinonSandbox } = require('@itavy/test-utilities');

describe('Initialization', () => {
  const sandbox = getSinonSandbox();
  let testTable = null;
  let emitter;
  let clock;

  beforeEach((done) => {
    clock = sandbox.useFakeTimers(Date.now());
    emitter = new EventEmitter();
    testTable = Reflect.construct(RequestsRoutingTable, [{
      name: 'testTABLE',
    }]);
    testTable.setMessagesTimeoutListener({ emitter });
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    clock.restore();
    testTable.close();
    done();
  });

  it('Should call checkRequestsQueue', (done) => {
    const spy = sandbox.spy(testTable, 'checkRequestsQueue');
    clock.tick(1001);
    expect(spy.callCount).to.be.equal(5);
    done();
  });

  it('Should reject with timoeut registered promise', () => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 6,
      },
    };
    const p = testTable.register(rec);
    clock.tick(6001);
    return p
      .should.be.rejected
      .then((response) => {
        expect(response).to.have.property('name', 'MQ_ROUTER_MESSAGE_TIMEOUT');
        return Promise.resolve();
      });
  });
});
