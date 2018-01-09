'use strict';

/* eslint-disable global-require */

describe('MQRouter', () => {
  require('./Initialization');
  require('./Close');
  require('./GetMessageId');
  require('./ValidateDestination');
  require('./BuildRequest');
  require('./DefaultMessageConsumer');
  require('./RespondToRequest');
  require('./WaitForSelfSubscription');
  require('./RouteMessage');
  require('./ConsumeMessages');
  require('./OwnHandler');
  require('./SendMQMsg');
  require('./SendMessage');
  require('./SendRequest');
});

/* eslint-enable global-require */
