'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const { getRecord } = require('./Fixtures');

describe('Register', () => {
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

  it('Should register provided info', (done) => {
    const rec = getRecord();
    const { index } = testTable.register(rec);
    rec.consumerTag = null;

    expect(index).to.be.a('string');
    expect(index.length).to.be.gt(0);
    expect(testTable.consumerTags).to.be.eql({});
    expect(testTable.handlers[index]).to.be.eql(rec);
    done();
  });

  it('Should increase count for same register provided info', (done) => {
    const rec = getRecord();
    const { index } = testTable.register({ ...rec, duplicate: false });
    testTable.update({ index, queue: rec.queue, consumerTag: 'consumerTag' });
    const { index: index1, consumerTag } = testTable.register({ ...rec, duplicate: false });
    rec.consumerTag = null;

    expect(index).to.be.eql(index1);
    expect(testTable.handlers[index].count).to.be.eql(1);
    expect(consumerTag).to.be.eql('consumerTag');
    done();
  });
});
