/**
 * verror
 * @external verror
 * @see {@link https://github.com/joyent/node-verror}
 */
/**
 * @typedef {Object} dependencyRule
 * @property {String} name name of the property to look for
 * @property {Boolean} [required = false] signal if the property is mandatory
 * @property {*} defaultValue if the property is mandatory and not present,
 * the result will take this value
 */

const has = Object.prototype.hasOwnProperty;


const errorList = {
  MQ_REQUIRED_DEPENDENCY: {
    name: 'MQ_REQUIRED_DEPENDENCY',
  },
};
/**
 * WError builder
 * @constructor
 * @memberof external:verror
 * @returns {external:verror.WError}
 */
const WError = require('verror').Werror;

/**
 * Provide an abstract way to construct errors
 * @param  {Object} errorInfo infos required to build mq error
 * @param  {String} errorInfo.name name of the MQ error to be displayed
 * @param  {Object} [errorInfo.error] original error
 * @param  {Object} [errorInfo.info] extra info regarding the error
 * @param  {String} [errorInfo.message] Human readable message for error
 * @return {external:verror.WError} an instance of WError
 */
const createMQError = function fCreateMQError(errorInfo) {
  return new WError({
    name:  errorInfo.name,
    cause: errorInfo.error || null,
    info:  Object.assign({}, errorInfo.info || {}, { timestamp: Date.now() }),
  }, errorInfo.message || 'An error has occurred');
};

/**
 * Validate that provided dependency meet required criteria
 * @param  {Object} dependency infos required for validation
 * @param  {String} dependency.name name of the module for which you validate
 * @param  {Object} dependency.di subject to validate
 * @param  {dependencyRule[]} dependency.rules rules to validate
 * @return {Object} computed dependency
 */
const validateConstructorDependencies = function fValidateConstructorDependencies(dependency) {
  const returnDependency = {};
  dependency.rules.every((rule) => {
    if (has.call(dependency.di, rule.name)) {
      returnDependency[rule.name] = dependency.di[rule.name];
    } else {
      if (rule.required) {
        throw createMQError({
          name:    errorList.MQ_REQUIRED_DEPENDENCY,
          message: `Missing ${rule.name} for module ${dependency.name}`,
        });
      }
      if (has(rule, 'defaultValue')) {
        if (rule.defaultValue instanceof Function) {
          returnDependency[rule.name] = rule.defaultValue();
        } else {
          returnDependency[rule.name] = rule.defaultValue;
        }
      } else {
        throw createMQError({
          name:    errorList.MQ_REQUIRED_DEPENDENCY,
          message: `Missing ${rule.name} for module ${dependency.name} and no defautlValue provided`,
        });
      }
    }
    return true;
  });
  return dependency;
};

module.exports = {
  createMQError,
  validateConstructorDependencies,
  has,
  errorList,
};
