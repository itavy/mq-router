'use strict';

const { RequestsRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');

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
