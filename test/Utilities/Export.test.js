'use strict';

const expect = require('../testHelpers').getExpect();
const utils = require('../../lib/utilities');


it('Should export required info', (done) => {
  expect(Object.keys(utils).length).to.equal(2);
  expect(utils).to.have.property('getUtilities');
  expect(utils).to.have.property('MQUtils');

  done();
});

it('MQUtils should have expected definition', (done) => {
  [
    'has',
    'extend',
    'createMQError',
    'validateConstructorDependencies',
    'stringToUint8Array',
    'stringFromUint8Array',
  ].map(el => expect(utils.MQUtils).to.have.property(el));
  done();
});

it('Should export same instance', (done) => {
  const utils1 = utils.getUtilities();
  const utils2 = utils.getUtilities();
  expect(utils1).to.be.equal(utils2);
  done();
});
