'use strict';

// const utils = require('@itavy/utilities').getUtilities();
const expect = require('@itavy/test-utilities').getExpect();
const sinon = require('@itavy/test-utilities').getSinon();
const factoryLib = require('../../lib/Serializers');
// const jsonSerializeLib = require('../../lib/Serializers/JSONSerializer');
const errors = require('../../lib/Errors');

let sandbox = null;

beforeEach((done) => {
  sandbox = sinon.sandbox.create();
  done();
});

afterEach((done) => {
  sandbox.restore();
  sandbox = null;
  done();
});

it('Should export required info', (done) => {
  expect(Object.keys(factoryLib).length).to.equal(1);
  expect(factoryLib).to.have.property('getSerializer');

  done();
});

it('Should fail for unknown serializer type', (done) => {
  const serializerType = '';
  // eslint-disable-next-line require-jsdoc
  const weirdSerializer = () => new Promise(resolve => resolve(factoryLib.getSerializer({
    type: serializerType,
  })));
  weirdSerializer()
    .should.be.rejected
    .then((resp) => {
      expect(resp.name).to.be.equal(errors.MQ_SERIALIZER_UNKNOWN_TYPE.name);
      expect(resp.message).to.be.equal(`${errors.MQ_SERIALIZER_UNKNOWN_TYPE.message}: '${serializerType}'`);
      return Promise.resolve();
    })

    .then(() => done())
    .catch(err => done(err));
});

it('Should return same JSON serializer', (done) => {
  const json1 = factoryLib.getSerializer({
    type: 'JSON',
  });
  const json2 = factoryLib.getSerializer({ type: 'JSON' });
  expect(json1).to.be.equal(json2);
  done();
});
