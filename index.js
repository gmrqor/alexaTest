'use strict';

const Alexa                = require('alexa-sdk');
const Config               = require('./common/Config');

const DefaultHandlers      = require('./handlers/DefaultHandlers');
const CommonHandlers       = require('./handlers/CommonHandlers');
const AccountHandlers      = require('./handlers/AccountHandlers');
const LoanHandlers         = require('./handlers/LoanHandlers');
const ExchangeRateHandlers = require('./handlers/ExchangeRateHandlers');

exports.handler = function (event, context, callback) {

    let alexa = Alexa.handler(event, context);
    alexa.appId = Config.appId;
    alexa.registerHandlers(DefaultHandlers, CommonHandlers, AccountHandlers, LoanHandlers, ExchangeRateHandlers);
    alexa.execute();
};