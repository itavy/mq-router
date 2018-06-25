'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const { addRecords, randomId, randomNumber } = require('./Fixtures');


describe('Unregister', () => {
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

  it('Should remove provided index', (done) => {
    const records = addRecords(testTable, 20);
    const pos = randomNumber(20);

    testTable.unregister({
      index: records[pos].index,
    });

    const handlers = records.reduce((acc, { index, rec }, aIndex) => {
      if (aIndex !== pos) {
        return Object.assign({}, acc, { [index]: rec });
      }
      return acc;
    }, {});
    const consumerTags = records.reduce((acc, { index, rec }, aIndex) => {
      if (aIndex !== pos) {
        return Object.assign({}, acc, { [rec.consumerTag]: index });
      }
      return acc;
    }, {});
    expect(testTable.consumerTags).to.be.eql(consumerTags);
    expect(testTable.handlers).to.be.eql(handlers);
    done();
  });

  it('Should return false for not registered index', (done) => {
    addRecords(testTable, 15);
    const result = testTable.unregister({
      index: randomId(),
    });
    expect(result).to.be.equal(false);
    done();
  });

  it('Should return true for existing index', (done) => {
    const records = addRecords(testTable, 15);
    const pos = randomNumber(15);

    const result = testTable.unregister({
      index: records[pos].index,
    });
    expect(result).to.be.equal(true);
    done();
  });

  it('Should have same number of registered when not duplicates', (done) => {
    const records = addRecords(testTable, 15);
    const pos = randomNumber(15);

    testTable.register({ ...records[pos].rec, duplicate: false });

    testTable.unregister({
      index: records[pos].index,
    });

    expect(Object.keys(testTable.handlers).length).to.be.equal(15);
    done();
  });

  it('Should have decreased the registered handlers when duplicates are unregistered twice', (done) => {
    const records = addRecords(testTable, 15);
    const pos = randomNumber(15);

    testTable.register({ ...records[pos].rec, duplicate: false });

    testTable.unregister({
      index: records[pos].index,
    });

    testTable.unregister({
      index: records[pos].index,
    });

    expect(Object.keys(testTable.handlers).length).to.be.equal(14);
    done();
  });
});
