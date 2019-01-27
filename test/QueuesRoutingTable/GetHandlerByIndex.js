'use strict';

const { expect } = require('@itavy/test-utilities');

const { QueuesRoutingTable } = require('../../');
const { randomId, addRecords, randomNumber } = require('./Fixtures');

describe('GetHandlerByIndex', () => {
  let testTable = null;

  beforeEach((done) => {
    testTable = Reflect.construct(QueuesRoutingTable, [{
      name: 'testTABLE',
    }]);
    done();
  });

  afterEach((done) => {
    done();
  });

  it('Should return requested index', (done) => {
    const records = addRecords(testTable, 20);
    const pos = randomNumber(20);

    const rec = testTable.getHandlerByIndex({
      index: records[pos].index,
    });

    expect(rec).to.be.eql(records[pos].rec);
    done();
  });

  it('Should throw error for unknown index', (done) => {
    addRecords(testTable, 10);

    try {
      testTable.getHandlerByIndex({
        index: randomId(),
      });
    } catch (error) {
      expect(error).to.be.instanceof(Error);
      expect(error).to.have.property('name', 'MQ_ROUTING_TABLE_UNKNOWN_INDEX');
      done();
    }
  });
});
