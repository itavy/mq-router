'use strict';

const chai = require('../../chaiHelp').chaiAsPromised();
const utils = require('../../../lib/utilities').getUtilities();
const testSerializer = require('../../../lib/Serializers/JSONSerializer').getSerializer({
  moduleName: 'testing',
  utils,
});
const fixtures = require('./Fixtures');

const expect = chai.expect;

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
      expect(resp.name).to.be.equal('MQ_SERIALIZE_ERROR');
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
      expect(resp.name).to.be.equal('MQ_UNSERIALIZE_ERROR');
      expect(resp.cause().message).to.be.equal('Unexpected end of JSON input');
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});
