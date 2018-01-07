'use strict';

const { RequestsRoutingTable } = require('../../');
const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');
const { expect } = require('@itavy/test-utilities');

describe('Initialization', () => {
  let testTable = null;
  let emitter;

  beforeEach((done) => {
    emitter = new EventEmitter();
    testTable = Reflect.construct(RequestsRoutingTable, [{
      name: 'testTABLE',
    }]);
    testTable.setMessagesTimeoutListener({ emitter });
    done();
  });

  afterEach((done) => {
    testTable.close();
    done();
  });

  it('Should throw an error for unknown messageId', (done) => {
    try {
      testTable.callById({
        id: randomBytes(10).toString('hex'),
      });
    } catch (error) {
      expect(error).to.have.property('name', 'MQ_ROUTER_UNKNOWN_MESSAGE_ID');
      done();
    }
  });

  it('Should unregister id from queue if listener exists', (done) => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 12,
      },
    };
    testTable.register(rec);
    testTable.callById({
      id: rec.id,
    });
    expect(testTable.mqRequestIds.length).to.be.equal(0);
    done();
  });

  it('Should reject registered promise', () => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 12,
      },
    };
    const error = {};
    const p = testTable.register(rec);
    testTable.callById({
      id: rec.id,
      error,
    });
    return p
      .should.be.rejected
      .then((response) => {
        expect(response).to.be.equal(error);
        return Promise.resolve();
      });
  });

  it('Should resolve registered promise', () => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 12,
      },
    };
    const message = {};
    const p = testTable.register(rec);
    testTable.callById({
      id: rec.id,
      message,
    });
    return p
      .should.be.fulfilled
      .then((response) => {
        expect(response).to.be.equal(message);
        return Promise.resolve();
      });
  });
});
