'use strict';

const MS_FACTOR = 1000;
const NS_FACTOR = 1e9;

/**
 * get time in nanoseconds since startTime provided
 * @param {Object} startTime startTime
 * @returns {number} time in nanoseconds
 * @private
 */
const getDiffFromStartTime = (startTime) => {
  const diff = process.hrtime(startTime);
  return (diff[0] * NS_FACTOR) + diff[1];
};

module.exports = {
  MS_FACTOR,
  NS_FACTOR,
  getDiffFromStartTime,
};
