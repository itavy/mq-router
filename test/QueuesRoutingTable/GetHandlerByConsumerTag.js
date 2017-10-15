'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const { randomId, addRecords, randomNumber } = require('./Fixtures');


describe('GetHandlerByConsumerTag', () => {
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

  it('Should return requested consumerTag', (done) => {
    const noRecords = 20;
    const records = addRecords(testTable, noRecords);
    const pos = randomNumber(noRecords);

    const rec = testTable.getHandlerByConsumerTag({
      consumerTag: records[pos].rec.consumerTag,
    });

    expect(rec).to.be.eql(records[pos].rec);
    done();
  });

  it('Should throw error for unknown consumerTag', (done) => {
    addRecords(testTable, 10);

    try {
      testTable.getHandlerByConsumerTag({
        consumerTag: randomId(),
      });
    } catch (error) {
      expect(error).to.be.instanceof(Error);
      expect(error).to.have.property('name', 'MQ_ROUTING_TABLE_UNKNOWN_CONSUMER_TAG');
      done();
    }
  });
});
