'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const { getRecord } = require('./Fixtures');


describe('Update', () => {
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

  it('Should update index', (done) => {
    const rec = getRecord();
    const { index } = testTable.register(rec);
    rec.consumerTag = 'testConsumerTag';
    rec.queue = 'testQueue';

    testTable.update({
      consumerTag: rec.consumerTag,
      queue:       rec.queue,
      index,
    });

    expect(testTable.consumerTags[rec.consumerTag]).to.be.equal(index);
    expect(testTable.handlers[index]).to.be.eql(rec);
    done();
  });
});
