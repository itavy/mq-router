'use strict';

const { RequestsRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');

describe('SetMessagesTimeoutListener', () => {
  let testTable = null;

  beforeEach((done) => {
    testTable = Reflect.construct(RequestsRoutingTable, [{
      name: 'testTABLE',
    }]);
    done();
  });

  afterEach((done) => {
    testTable.close();
    done();
  });

  it('Should set event emitter', (done) => {
    const emitter = {};
    testTable.setMessagesTimeoutListener({ emitter });
    expect(testTable.mqrEvents).to.be.equal(emitter);
    done();
  });
});
