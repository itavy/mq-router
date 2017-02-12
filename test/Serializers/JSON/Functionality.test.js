'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const utils = require('@itavy/utilities').getUtilities();
const testSerializerLib = require('../../../lib/Serializers/JSONSerializer');
const errors = require('../../../lib/Errors');

const testSerializer = new testSerializerLib.MQJSONSerializer({
  utils,
  errors,
});
const fixtures = require('./Fixtures');

it('Should return an instance Uint8Array', (done) => {
  testSerializer.serialize(fixtures.msgToSerialize)
    .should.be.fulfilled
    .then((resp) => {
      expect(resp).to.be.eql(fixtures.expectedMsgSerialized);
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});

it('Should return an expected error', (done) => {
  testSerializer.serialize(fixtures.failMsgToSerialize)
    .should.be.rejected
    .then((resp) => {
      expect(resp.name).to.be.equal(errors.MQ_SERIALIZE_ERROR.name);
      expect(resp.cause().message).to.be.equal('Cannot convert undefined or null to object');
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});

it('should return expected unserialized message', (done) => {
  testSerializer.unserialize(fixtures.msgToUnserialize)
  .should.be.fulfilled
  .then((resp) => {
    expect(resp).to.be.eql(fixtures.expectedMsgUnserialized);
    return Promise.resolve();
  })
  .then(() => done())
  .catch(err => done(err));
});


it('Should return an expected error', (done) => {
  testSerializer.unserialize(fixtures.failMsgToUnserialize)
    .should.be.rejected
    .then((resp) => {
      expect(resp.name).to.be.equal(errors.MQ_UNSERIALIZE_ERROR.name);
      expect(resp.cause().name).to.be.equal('JSON_UNSERIALIZE_ERROR');
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});
