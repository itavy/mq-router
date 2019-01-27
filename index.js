'use strict';

const semver = require('semver');

const minNodeVersion = '8.6.0';

/**
 * check if min nodejs requirements are met
 * @returns {Object} @itavy/mq-router module
 */
const getVersionModule = () => {
  if (semver.lt(process.version, minNodeVersion)) {
    throw Error(`Invalid node version for @itavy/mq-router, current: ${process.version}, min: ${minNodeVersion}`);
  }

  // eslint-disable-next-line global-require
  return require('./lib/latest');
};

module.exports = getVersionModule();
