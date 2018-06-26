'use strict';

const { QueuesRoutingTable } = require('../../');
const { expect } = require('@itavy/test-utilities');
const {
  randomId,
  randomNumber,
  dummyQueue,
  dummyTopic,
  exchange,
} = require('./Fixtures');


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


  it('Should return right properties for registered queue', (done) => {
    const pos = randomNumber(15);
    const rec = {
      queue:    `testQueue${pos}`,
      topic:    `testTopic${pos}`,
      exchange: `testExchange${pos}`,
      handler:  {},
    };
    const cTagTest = randomId(30);
    const { index } = testTable.register(rec);
    testTable.update({
      index,
      consumerTag: cTagTest,
      queue:       rec.queue,
    });
    const result = testTable.getHandlerRefsByProperties(rec);
    expect(result.index).to.be.equal(index);
    expect(result.consumerTag).to.be.equal(cTagTest);
    done();
  });

  it('Should return an object with null consumerTag and index if queue not registered', (done) => {
    const result = testTable.getHandlerRefsByProperties({
      queue: dummyQueue,
      topic: dummyTopic,
      exchange,
    });
    expect(result.consumerTag).to.be.equal(null);
    expect(result.index).to.be.equal(null);
    done();
  });
});
