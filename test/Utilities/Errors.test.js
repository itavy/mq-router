'use strict';

const expect = require('../testHelpers').getExpect();
const utils = require('../../lib/utilities');


const verror = require('verror');

it('Should return an instance of Werror', (done) => {
  const mqErr = utils.MQUtils.createMQError({
    name:    'errname',
    error:   new Error('test error'),
    info:    { id: 1 },
    message: 'err message',
  });
  expect(mqErr).to.be.an.instanceof(verror.WError);
  done();
});

it('Should add timestamp if none provided', (done) => {
  const mqErr = utils.MQUtils.createMQError({
    name:    'errname',
    error:   new Error('test error'),
    info:    {},
    message: 'err message',
  });
  const mqInfo = verror.VError.info(mqErr);
  expect(mqInfo).to.have.property('timestamp');
  done();
});

it('Should put only timestamp in info if info not provided', (done) => {
  const mqErr = utils.MQUtils.createMQError({
    name:    'errname',
    error:   new Error('test error'),
    message: 'err message',
  });
  const mqInfo = verror.VError.info(mqErr);
  expect(mqInfo).to.be.eql({ timestamp: mqInfo.timestamp });
  done();
});

it('Should add a default message if none provided', (done) => {
  const mqErr = utils.MQUtils.createMQError({
    name:  'errname',
    error: new Error('test error'),
    info:  {},
  });
  expect(mqErr).to.have.property('message', 'An error has occurred');
  done();
});

it('Should put null as cause if none provided', (done) => {
  const mqErr = utils.MQUtils.createMQError({
    name: 'errname',
    info: {},
  });
  expect(mqErr.cause()).to.be.equal(undefined);
  done();
});

it('Should use provided info', (done) => {
  const errName = 'eRrNaMe';
  const errTest = new Error('test error');
  const errMessage = 'eRrMeSsAgE';
  const mqErr = utils.MQUtils.createMQError({
    name:    errName,
    error:   errTest,
    info:    {},
    message: errMessage,
  });
  expect(mqErr).to.have.property('message', errMessage);
  expect(mqErr).to.have.property('name', errName);
  expect(mqErr.cause()).to.be.equal(errTest);
  done();
});
