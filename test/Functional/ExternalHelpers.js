'use strict';

const Readable = require('stream').Readable;
const exec = require('child-process-promise').exec;
const nodeTab = require('tab');
const utils = require('@itavy/utilities').getUtilities();

/**
 * run external command
 * @param  {Object} request request to run command
 * @param  {String} request.command command to run
 * @param  {Promise} [request.errorCodeHandler] custom error handler for possible command errors
 * @param  {String[]} request.outputColumns key names for command output columns
 * @return {Promise.<Array>} an array with records defined in outputColumns
 */
const runExternalCommand = request => exec(request.command)
    .catch((errorCommand) => {
      if (utils.has(request, 'errorCodeHandler')) {
        return request.errorCodeHandler(errorCommand);
      }
      return Promise.reject(errorCommand);
    })
    .then(resultCmd => new Promise((resolve, reject) => {
      if (0 !== resultCmd.stderr.length) {
        reject(resultCmd.stderr);
      } else {
        const resultAcc = [];
        const stdOutStream = new Readable();
        stdOutStream.push(resultCmd.stdout);
        stdOutStream.push(null);
        stdOutStream.on('end', () => resolve(resultAcc));
        const input = new nodeTab.TableInputStream({
          stream:  stdOutStream,
          columns: request.outputColumns,
        });
        input.on('row', row => resultAcc.push(row));
      }
    }));

module.exports = {
  runExternalCommand,
};
