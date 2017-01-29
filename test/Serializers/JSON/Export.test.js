'use strict';

const expect = require('../../testHelpers').getExpect();
const utils = require('../../../lib/utilities').getUtilities();
const jsonSerializeLib = require('../../../lib/Serializers/JSONSerializer');

it('Should export required info', (done) => {
  expect(Object.keys(jsonSerializeLib).length).to.equal(2);
  expect(jsonSerializeLib).to.have.property('getSerializer');
  expect(jsonSerializeLib).to.have.property('MQJSONSerializer');

  done();
});

it('Should return an instance of MQJSONSerializer', (done) => {
  const testSerializer = jsonSerializeLib.getSerializer({
    moduleName: 'testing',
    utils,
  });
  expect(testSerializer).to.be.instanceof(jsonSerializeLib.MQJSONSerializer);
  done();
});

it('Should use provided json stringify library', (done) => {
  const testStringify = {};
  const testSerializer = jsonSerializeLib.getSerializer({
    moduleName:    'testing',
    jsonStringify: testStringify,
    utils,
  });
  expect(testSerializer.stringify).to.be.equal(testStringify);
  done();
});
