'use strict';

const expect = require('../testHelpers').getExpect();
const sinon = require('../testHelpers').getSinon();
const utils = require('../../lib/utilities').getUtilities();
const factoryLib = require('../../lib/Serializers');
const jsonSerializeLib = require('../../lib/Serializers/JSONSerializer');

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
      expect(resp.name).to.be.equal('MQ_SERIALIZER_UNKNOWN_TYPE');
      expect(resp.message).to.be.equal(`Unknown requested type: '${serializerType}'`);
      return Promise.resolve();
    })

    .then(() => done())
    .catch(err => done(err));
});

// it will call it since noone has requested a serializer through factory
// if later will be the case then there will be needed of a method to reset factory singletons
it('Should call JSON serializer constructor with expected parameters', (done) => {
  const jsonSpy = sandbox.spy(jsonSerializeLib, 'getSerializer');
  const moduleName = 'testing';
  // eslint-disable-next-line require-jsdoc
  const getSerializer = () => new Promise(resolve => resolve(factoryLib.getSerializer({
    type: 'JSON',
    moduleName,
  })));

  getSerializer()
    .should.be.fulfilled
    .then((resp) => {
      expect(resp).to.be.an.instanceof(jsonSerializeLib.MQJSONSerializer);
      expect(jsonSpy.callCount).to.be.equal(1);
      expect(jsonSpy.getCall(0).args[0]).to.have.property('utils', utils);
      expect(jsonSpy.getCall(0).args[0]).to.have.property('moduleName', moduleName);

      return Promise.resolve();
    })

    .then(() => done())
    .catch(err => done(err));
});

it('Should return same JSON serializer', (done) => {
  const json1 = factoryLib.getSerializer({
    type:       'JSON',
    moduleName: 'testing',
  });
  const json2 = factoryLib.getSerializer({ type: 'JSON' });
  expect(json1).to.be.equal(json2);
  done();
});
