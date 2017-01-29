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
  testSerializer.serialize({
    msgId:     'tesmsgId',
    timestamp: 123456789,
    replyTo:   'replyId',
    replyOn:   'msgreply',
    message:   Uint8Array.from('test message'),
  })
    .should.be.fulfilled
    .then((resp) => {
      expect(resp).to.be.eql(fixtures.expectedSerialize);
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});

it('Should return an expected error', (done) => {
  testSerializer.serialize({
    msgId:     'tesmsgId',
    timestamp: 123456789,
    replyTo:   'replyId',
    message:   null,
  })
    .should.be.rejected
    .then((resp) => {
      expect(resp.name).to.be.equal('MQ_SERIALIZE_ERROR');
      return Promise.resolve();
    })
    .then(() => done())
    .catch(err => done(err));
});
