'use strict';

/**
 * Chai assert library
 * @external chai
 * @see {@link http://chaijs.com/}
 */

 /**
  * Chai promise assert library
  * @external chai-as-promised
  * @see {@link https://github.com/domenic/chai-as-promised}
  */

/**
 * Standalone and test framework agnostic JavaScript test spies, stubs and mocks
 * @external sinon
 * @see {@link https://github.com/sinonjs/sinon}
 */

const chaiLibrary = require('chai');
const chaiAsPromisedLib = require('chai-as-promised');
const sinonLibrary = require('sinon');

// extend sinon wiht promise support
// @see {@link https://github.com/bendrucker/sinon-as-promised}
require('sinon-as-promised');

/**
 * Sinon stubs/mocks/spies etc.
 * @return {external:sinon} [description]
 */
const getSinon = () => sinonLibrary;
/**
 * Chai with promise support library
 * @return {external:chai-as-promised} chai with support library
 */
const getChai = () => {
  chaiLibrary.use(chaiAsPromisedLib);
  chaiLibrary.should();
  return chaiLibrary;
};

module.exports = {
  getExpect: () => getChai().expect,
  getChai,
  getSinon,
};
