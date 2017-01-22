'use strict';

/**
 * Utilities module
 * @module MQRouter/Utilities
 */

/**
 * verror
 * @external verror
 * @see {@link https://github.com/joyent/node-verror}
 */
/**
 * text-encoding
 * @external text-encoding
 * @see {@link https://github.com/inexorabletash/text-encoding}
 */

/**
 * @typedef {Object} dependencyRule
 * @property {String} name name of the property to look for
 * @property {Boolean} [required = false] signal if the property is mandatory
 * @property {*} defaultValue if the property is mandatory and not present,
 * the result will take this value
 */

/**
 * verror library
 * @type {external:verror}
 * @private
 */
const verror = require('verror');

/**
 * Error list
 * @type {Object}
 * @private
 */
const errors = require('./Errors');

/**
 * Text Encoding library
 * @type {external:text-encoding}
 */
const StringDecoderLib = require('text-encoding');

/**
 * Uint8Array to string
 * @type {external:text-encoding.TextDecoder}
 */
const sDecoder = new StringDecoderLib.TextDecoder('utf-8');
/**
 * String to Uint8Array
 * @type {external:text-encoding.TextEncoder}
 */
const sEncoder = new StringDecoderLib.TextEncoder('utf-8');

/**
 * MQUtils singleton
 * @type {MQUtils}
 */
let sMqUtils = null;

/**
 * Utilities class
 */
class MQUtils {
  /**
   * Check if an object has property
   * @param {Object} objToBeCheck Object to be checked
   * @param {String} propertyName Name of the property to look for
   * @return {Boolean} Returns true if the object has the requested property
   */
  static has(objToBeCheck, propertyName) {
    return Object.prototype.hasOwnProperty.call(objToBeCheck, propertyName);
  }

  /**
   * Return a new object by combining the one provided
   * @param {Object} objToExtend first object
   * @param {Object} objToAdd second object
   * @return {Object} new object
   */
  static extend(objToExtend, ...objToAdd) {
    return Object.assign({}, ...objToAdd, objToExtend);
  }

  /**
   * Provide an abstract way to construct errors
   * @param  {Object} errorInfo infos required to build mq error
   * @param  {String} errorInfo.name name of the MQ error to be displayed
   * @param  {Object} [errorInfo.error] original error
   * @param  {Object} [errorInfo.info] extra info regarding the error
   * @param  {String} [errorInfo.message] Human readable message for error
   * @return {external:verror.WError} an instance of WError
   */
  static createMQError(errorInfo) {
    return new verror.WError({
      name:  errorInfo.name,
      cause: errorInfo.error || null,
      info:  MQUtils.extend(errorInfo.info || {}, { timestamp: Date.now() }),
    }, errorInfo.message || 'An error has occurred');
  }

  /**
   * Validate that provided dependency meet required criteria
   * @param  {Object} dependency infos required for validation
   * @param  {String} dependency.name name of the module for which you validate
   * @param  {Object} dependency.di subject to validate
   * @param  {dependencyRule[]} dependency.rules rules to validate
   * @return {Object} computed dependency
   */
  static validateConstructorDependencies(dependency) {
    const returnDependency = {};
    dependency.rules.every((rule) => {
      if (MQUtils.has(dependency.di, rule.name)) {
        returnDependency[rule.name] = dependency.di[rule.name];
      } else {
        if (rule.required) {
          throw MQUtils.createMQError({
            name:    errors.MQ_REQUIRED_DEPENDENCY.name,
            message: `Missing ${rule.name} for module ${dependency.name}`,
          });
        }
        if (MQUtils.has(rule, 'defaultValue')) {
          if (rule.defaultValue instanceof Function) {
            returnDependency[rule.name] = rule.defaultValue();
          } else {
            returnDependency[rule.name] = rule.defaultValue;
          }
        } else {
          throw MQUtils.createMQError({
            name:    errors.MQ_REQUIRED_DEPENDENCY.name,
            message: `Missing ${rule.name} for module ${dependency.name} and no defautlValue provided`,
          });
        }
      }
      return true;
    });
    return MQUtils.extend(dependency.di, returnDependency);
  }

  /**
   * Utility for transforming strings into Uint8Array
   * @param {String} request String to be transformed into Uint8Array
   * @returns {Uint8Array} Uint8Array
   */
  static stringToUint8Array(request) {
    return sEncoder.encode(request);
  }

  /**
   * Utility for transforming Uint8Array into strings
   * @param {Uint8Array} request Uint8Array to be transformed into String
   * @returns {String} String
   */
  static stringFromUint8Array(request) {
    return sDecoder.decode(request);
  }
}

/**
 * MQUtils singleton builder
 * @return {MQUtils} MQUtils instance
 */
const getUtilities = () => {
  if (null === sMqUtils) {
    sMqUtils = new MQUtils();
  }
  return sMqUtils;
};

module.exports = {
  getUtilities,
  MQUtils,
};
