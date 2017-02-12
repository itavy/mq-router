'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const jsonSerializeLib = require('../../../lib/Serializers/JSONSerializer');

it('Should export required info', (done) => {
  expect(Object.keys(jsonSerializeLib).length).to.equal(1);
  expect(jsonSerializeLib).to.have.property('MQJSONSerializer');

  done();
});
