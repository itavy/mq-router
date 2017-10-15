'use strict';

const { RequestsRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');

describe('Initialization', () => {
  let testTable = null;

  beforeEach((done) => {
    testTable = Reflect.construct(RequestsRoutingTable, [{
      name: 'testTABLE',
    }]);
    done();
  });
  afterEach((done) => {
    clearInterval(testTable.checkIntervalId);
    done();
  });

  it('Shoould provide a well formed object', (done) => {
    expect(testTable).to.be.an('object');
    expect(testTable).to.be.instanceof(RequestsRoutingTable);
    expect(testTable).to.have.property('mqrEvents', null);
    expect(testTable).to.have.property('sourceIdentifier', 'testTABLE.RequestsRoutingTable');
    expect(testTable).to.have.property('mqRequestIds');
    expect(testTable).to.have.property('checkIntervalId');
    done();
  });

  it('Should have all methods', (done) => {
    expect(testTable).to.respondTo('register');
    expect(testTable).to.respondTo('callById');
    expect(testTable).to.respondTo('setMessagesTimeoutListener');
    expect(testTable).to.respondTo('checkRequestsQueue');

    done();
  });
});
