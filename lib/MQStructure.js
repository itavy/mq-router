'use strict';

/**
 * MQStructure definition
 */
class MQStructure {
  /**
   * MQStructure constructor
   * @param {Object} di dependencies required for MQStructure
   * @returns {MQStructure} an instance of MQStructure
   */
  constructor(di) {
    this.utils = di.utils;
    this.log = di.log;
    this.errors = di.errors;
  }

  /**
   * Create MQ message structure
   * @param {*} request input to be converted in mq structure
   * @returns {Promise.<Object>} on succuess
   * @public
   */
  createStructure(request) {
    return this.validateCreateStructure(request)
      .then(validatedResponse => Promise.resolve({
        msgId:     validatedResponse.msgId,
        timestamp: validatedResponse.timestamp,
        replyTo:   validatedResponse.replyTo,
        replyOn:   validatedResponse.replyOn,
        message:   validatedResponse.message,
      }))
      .catch((errorValidate) => {
        this.log('error', `Create structure: ${errorValidate.message}`);
        return Promise.reject(this.utill.createError({
          name:    this.errors.MQ_STRUCTURE_VALIDATE.name,
          error:   errorValidate,
          message: this.errors.MQ_STRUCTURE_VALIDATE.message,
        }));
      });
  }

  /**
   * validate input for create structure
   * @param {*} request input to be validated;
   * @returns {Promise.<*>} returns inptut provided on success
   * @private
   */
  validateCreateStructure(request) {
    return new Promise((resolve, reject) => {
      this.log('debug', 'Validate: start');
      [
        'msgId',
        'timestamp',
        'from',
        'replyTo',
        'replyOn',
        'message',
      ].map((field) => {
        this.log('trace', `Validate field: ${field}`);
        if (this.utils.has(request, field)) {
          return true;
        }
        return reject(this.utill.createError({
          name: this.errors.MQ_STRUCTURE_VALIDATE_MISSING_FIELD.name,
          info: {
            field,
          },
          message: this.errors.MQ_STRUCTURE_VALIDATE_MISSING_FIELD.message,
        }));
      });
      this.log('debug', 'Validate: end');
      return resolve(request);
    })
      .catch((errorValidate) => {
        this.log('error', `Validate create structure: ${errorValidate.message}`);
        return Promise.reject(this.utill.createError({
          name:    this.errors.MQ_STRUCTURE_VALIDATE.name,
          error:   errorValidate,
          message: this.errors.MQ_STRUCTURE_VALIDATE.message,
        }));
      });
  }
}

module.exports = {
  MQStructure,
};
