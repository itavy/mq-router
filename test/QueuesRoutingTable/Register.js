'use strict';

const { expect } = require('@itavy/test-utilities');

const { QueuesRoutingTable } = require('../../');
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
});
