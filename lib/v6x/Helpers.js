'use strict';

const assert = require('assert');
const uuid = require('uuid/v4');

const MS_FACTOR = 1000;
const NS_FACTOR = 1e9;

var _require = require('@itavy/ierror');

const rejectWithError = _require.rejectWithError,
      IError = _require.IError;

// eslint-disable-next-line require-jsdoc

const has = (obj, property) => {
  if (obj === null || !obj) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, property);
};

module.exports = {
  assert,
  has,
  uuid,
  rejectWithError,
  IError,
  MS_FACTOR,
  NS_FACTOR
};