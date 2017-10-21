'use strict';

describe('MQRouter', () => {
  require('./Initialization'); // eslint-disable-line global-require
  require('./GetMessageId'); // eslint-disable-line global-require
  require('./ValidateDestination'); // eslint-disable-line global-require
  require('./BuildRequest'); // eslint-disable-line global-require
  require('./DefaultMessageConsumer'); // eslint-disable-line global-require
});
