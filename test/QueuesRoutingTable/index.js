'use strict';

describe('QueuesRoutingTable', () => {
  require('./Initialization'); // eslint-disable-line global-require
  require('./Register'); // eslint-disable-line global-require
  require('./Update'); // eslint-disable-line global-require
  require('./Unregister'); // eslint-disable-line global-require
  require('./GetHandlerByIndex'); // eslint-disable-line global-require
  require('./GetHandlerByConsumerTag'); // eslint-disable-line global-require
  require('./GetHandlerRefsByProperties'); // eslint-disable-line global-require
});
