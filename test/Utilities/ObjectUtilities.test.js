'use strict';

const chai = require('chai');
const utils = require('../../lib/utilities');

const expect = chai.expect;


it('Should return true for existing property', (done) => {
  const testObj = { testField: false };
  const resultTest = utils.MQUtils.has(testObj, 'testField');

  expect(resultTest).to.be.equal(true);

  done();
});

it('Should return false for existing property', (done) => {
  const testObj = { testField: false };
  const resultTest = utils.MQUtils.has(testObj, 'randomField');

  expect(resultTest).to.be.equal(false);

  done();
});

it('Should extend correct two objects', (done) => {
  const o1 = { fieldO1: 123 };
  const o2 = { fieldO2: 456 };
  const oResult = utils.MQUtils.extend(o1, o2);
  const expectedResult = { fieldO1: 123, fieldO2: 456 };

  expect(oResult).to.be.eql(expectedResult);

  done();
});

it('Should extend correct more than two objects', (done) => {
  const o1 = { fieldO1: 123 };
  const o2 = { fieldO2: 456 };
  const o3 = { fieldO3: 789 };
  // return Object.assign({}, Object.assign({}, ...objToAdd), objToExtend);
  const oResult = utils.MQUtils.extend(o1, o2, o3);
  const expectedResult = { fieldO1: 123, fieldO2: 456, fieldO3: 789 };

  expect(oResult).to.be.eql(expectedResult);

  done();
});

it('Should not overrite properties from first object', (done) => {
  const o1 = { fieldO1: 123 };
  const o2 = { fieldO1: 789, fieldO2: 456 };
  const o3 = { fieldO1: 456, fieldO3: 789 };
  const oResult = utils.MQUtils.extend(o1, o2, o3);
  const expectedResult = { fieldO1: 123, fieldO2: 456, fieldO3: 789 };

  expect(oResult).to.be.eql(expectedResult);

  done();
});
