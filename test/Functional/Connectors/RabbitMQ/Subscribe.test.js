'use strict';

const expect = require('@itavy/test-utilities').getExpect();
//  const utils = require('@itavy/utilities').getUtilities();
const connectorsLib = require('../../../../lib/Connectors');
// const amqplib = require('amqplib');

const fixtures = require('./Fixtures');
const externalHelpers = require('../../ExternalHelpers');

let rabbitConnector;

beforeEach((done) => {
  rabbitConnector = connectorsLib.getNewConnector({
    type:            'RABBITMQ',
    connURI:         fixtures.mqConnURI,
    exchangeName:    fixtures.exchangeName,
    exchangeOptions: fixtures.exchangeOptions,
    publishTTL:      fixtures.publishTTL,
  });
  return done();
});

afterEach((done) => {
  rabbitConnector.connection.instance.close()
    .then(() => {
      rabbitConnector = null;
      done();
    });
});


it('Should subscribe', (done) => {
  rabbitConnector.start({
    mqListen: {
      name:    fixtures.ownPrivateQueue,
      options: fixtures.ownPrivateQueueOptions,
      rkey:    fixtures.ownPrivateRoutingKey,
      handler: () => null,
    },
  })
    .then(() => externalHelpers.runExternalCommand(fixtures.cmdCheckPrivateQueue))
    .then((cmdResponse) => {
      expect(cmdResponse.length).to.be.equal(1, 'ownPrivateQueue not defined');
      expect(cmdResponse[0].name).to.be.equal(fixtures.ownPrivateQueue, 'Invalid ownPrivateQueue name');
      expect(cmdResponse[0].durable).to.be.equal(`${fixtures.ownPrivateQueueOptions.durable}`, 'Invalid ownPrivateQueue durable option');
      expect(cmdResponse[0].exclusive).to.be.equal(`${fixtures.ownPrivateQueueOptions.exclusive}`, 'Invalid ownPrivateQueue exclusive option');
      expect(cmdResponse[0].autoDelete).to.be.equal(`${fixtures.ownPrivateQueueOptions.autoDelete}`, 'Invalid ownPrivateQueue autoDelete option');
      return Promise.resolve();
    })
    .then(() => externalHelpers.runExternalCommand(fixtures.cmdCheckPrivateBinding))
    .then((cmdResponse) => {
      expect(cmdResponse.length).to.be.equal(2, 'ownPrivateQueue invalid bindings');
      expect(cmdResponse[1].pattern).to.be.equal(fixtures.ownPrivateRoutingKey, 'Invalid ownPrivateQueue binding');
      expect(cmdResponse[1].sourceName).to.be.equal(fixtures.exchangeName, 'Invalid ownPrivateQueue exchange binding');
      return Promise.resolve();
    })
    .then(() => done())
    .catch((err) => {
      // console.log(err.cause());
      done(err);
    });
});
