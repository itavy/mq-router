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


const chaiLibrary = require('chai');
const chaiAsPromisedLib = require('chai-as-promised');

/**
 * Chai wihout promise support library
 * @return {external:chai} chai library
 */
const chai = () => chaiLibrary;

/**
 * Chai with promise support library
 * @return {external:chai-as-promised} chai with support library
 */
const chaiAsPromised = () => {
  const lChai = chai();
  lChai.use(chaiAsPromisedLib);
  lChai.should();
  return lChai;
};

module.exports = {
  chai,
  chaiAsPromised,
};
