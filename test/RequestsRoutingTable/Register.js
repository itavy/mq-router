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

  it('Shuld register an entry', (done) => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 12,
      },
    };
    testTable.register(rec);
    expect(testTable.mqRequestIds.length).to.be.equal(1);
    expect(testTable.mqRequestIds[0]).to.have.property('id', rec.id);
    expect(testTable.mqRequestIds[0]).to.have.property('ttl', 12000);
    expect(testTable.mqRequestIds[0]).to.have.property('ts');
    done();
  });

  it('Should return a promise', (done) => {
    const rec = {
      id:      randomBytes(10).toString('hex'),
      options: {
        ttl: 12,
      },
    };
    const p = testTable.register(rec);
    expect(p).to.be.instanceof(Promise);
    done();
  });
});
