'use strict';

const { expect } = require('@itavy/test-utilities');

const { QueuesRoutingTable } = require('../../');

describe('Initialization', () => {
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

  it('Shoould provide a well formed object', (done) => {
    expect(testTable).to.be.an('object');
    expect(testTable).to.be.instanceof(QueuesRoutingTable);
    expect(testTable).to.have.property('handlers');
    expect(testTable.handlers).to.be.eql({});
    expect(testTable).to.have.property('consumerTags');
    expect(testTable.consumerTags).to.be.eql({});
    done();
  });

  it('Should have all methods', (done) => {
    expect(testTable).to.respondTo('register');
    expect(testTable).to.respondTo('update');
    expect(testTable).to.respondTo('unregister');
    expect(testTable).to.respondTo('getHandlerByIndex');
    expect(testTable).to.respondTo('getHandlerByConsumerTag');

    done();
  });
});
