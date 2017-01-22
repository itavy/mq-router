'use strict';

const chai = require('chai');
const utils = require('../../lib/utilities');

const expect = chai.expect;

it('Should return a di for the rules provided', (done) => {
  const defaultValue1 = 'dEfAuLtVaLuE';
  const defaultValue2 = 'fUnCtIoNdEfAuLtVaLuE';
  const testRules = [
    { name: 'key1' },
    { name: 'key2', required: true },
    { name: 'key3', defaultValue: defaultValue1 },
    { name: 'key4', defaultValue: () => defaultValue2 },
  ];
  const refObj = {};
  const diToTest = {
    key1: refObj,
    key2: refObj,
  };
  const expectedDi = {
    key1: refObj,
    key2: refObj,
    key3: defaultValue1,
    key4: defaultValue2,
  };
  const resDi = utils.MQUtils.validateConstructorDependencies({
    name:  'testModule',
    di:    diToTest,
    rules: testRules,
  });
  expect(resDi).to.be.eql(expectedDi);
  done();
});

it('should throw an error when property is required and not present', (done) => {
  const testRules = [
    { name: 'key1', required: true },
  ];
  const diToTest = {};
  // eslint-disable-next-line require-jsdoc
  const testDi = () => utils.MQUtils.validateConstructorDependencies({
    name:  'testModule',
    di:    diToTest,
    rules: testRules,
  });
  expect(testDi).to.throw('Missing key1 for module testModule');
  done();
});

it('should throw an error when rule is defined and has no default value', (done) => {
  const testRules = [
    { name: 'key1' },
  ];
  const diToTest = {};
  // eslint-disable-next-line require-jsdoc
  const testDi = () => utils.MQUtils.validateConstructorDependencies({
    name:  'testModule',
    di:    diToTest,
    rules: testRules,
  });
  expect(testDi).to.throw('Missing key1 for module testModule and no defautlValue provided');
  done();
});

it('should not validate properties not defined in rules', (done) => {
  const testRules = [
    { name: 'key1' },
    { name: 'key2', required: true },
  ];
  const refObj = {};
  const diToTest = {
    key1: refObj,
    key2: refObj,
    key3: refObj,
    key4: refObj,
  };
  const expectedDi = {
    key1: refObj,
    key2: refObj,
    key3: refObj,
    key4: refObj,
  };
  const resDi = utils.MQUtils.validateConstructorDependencies({
    name:  'testModule',
    di:    diToTest,
    rules: testRules,
  });
  expect(resDi).to.be.eql(expectedDi);
  done();
});
