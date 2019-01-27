'use strict';

const { expect } = require('@itavy/test-utilities');

const { RequestsRoutingTable } = require('../../');

describe('Close', () => {
  it('Should clear registered interval', () => {
    const testTable = Reflect.construct(RequestsRoutingTable, [{
      name: 'testTABLE',
    }]);

    testTable.close();
    expect(testTable.checkIntervalId).to.be.equal(null);
    return Promise.resolve();
  });
});
