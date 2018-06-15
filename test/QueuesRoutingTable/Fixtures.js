'use strict';

const { randomBytes } = require('crypto');

// eslint-disable-next-line require-jsdoc
const getRecord = () => ({
  queue:    {},
  topic:    {},
  exchange: {},
  handler:  {},
  count:    0,
});

// eslint-disable-next-line require-jsdoc
const randomId = (length = 20) => randomBytes(length).toString('hex');

// eslint-disable-next-line require-jsdoc
const addRecords = (target, noOfRecords = 1) => {
  let k;
  const retRec = [];
  for (k = 0; k < noOfRecords; k += 1) {
    const rec = getRecord();
    const { index } = target.register(rec);
    rec.consumerTag = `testConsumerTag${k}`;
    rec.queue = `testQueue${k}`;
    target.update({
      consumerTag: rec.consumerTag,
      queue:       rec.queue,
      index,
    });
    retRec.push({
      index,
      rec,
    });
  }
  return retRec;
};

// eslint-disable-next-line require-jsdoc
const randomNumber = (max, min = 0) => {
  const lmin = Math.ceil(min);
  const lmax = Math.floor(max);
  return Math.floor(Math.random() * (lmax - lmin)) + lmin;
};

module.exports = {
  getRecord,
  randomBytes,
  randomId,
  addRecords,
  randomNumber,
};
