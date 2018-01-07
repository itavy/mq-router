'use strict';

describe('MQRouter', () => {
  require('./Initialization'); // eslint-disable-line global-require
  require('./GetMessageId'); // eslint-disable-line global-require
  require('./ValidateDestination'); // eslint-disable-line global-require
  require('./BuildRequest'); // eslint-disable-line global-require
  require('./DefaultMessageConsumer'); // eslint-disable-line global-require
  require('./RespondToRequest'); // eslint-disable-line global-require
  require('./WaitForSelfSubscription'); // eslint-disable-line global-require
  require('./RouteMessage'); // eslint-disable-line global-require
  require('./ConsumeMessages'); // eslint-disable-line global-require
});
