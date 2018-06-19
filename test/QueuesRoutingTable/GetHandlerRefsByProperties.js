'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const { addRecords, randomNumber } = require('./Fixtures');


describe('GetHandlerRefsByProperties', () => {
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

  it('Should get the right index for properties', (done) => {
    const records = addRecords(testTable, 10);
    const pos = randomNumber(10);

    const {
      queue, exchange, topic,
    } = records[pos].rec;

    const { index } = testTable.getHandlerRefsByProperties({
      queue, exchange, topic,
    });

    expect(records[pos].index).to.be.eql(index);
    done();
  });

  it('Should have no index when routing table is empty', (done) => {
    const exists = testTable.getHandlerRefsByProperties({
      queue:    '',
      exchange: '',
      topic:    '',
    });
    expect(exists).to.be.eql(null);
    done();
  });
});
