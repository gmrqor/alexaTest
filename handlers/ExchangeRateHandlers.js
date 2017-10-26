'use strict';

const Config   = require('../common/Config');
const GibUtil  = require('../common/GibUtil');
const Messages = require('../messages/ExchangeRateMessages');

const handlers = {

    'ExchangeRate' : function() {

        console.info('Starting ExchangeRate');

        let options = {
            handler : this,
            type    : 'form',
            path    : 'exchangerate',
            success : callback,
            data    : {}
        };

        let currencySlot = this.event.request.intent.slots.CURRENCY;
        let dateSlot     = this.event.request.intent.slots.DATE;

        if (currencySlot && currencySlot.value) {
            options.data.ccy = currencySlot.value;
        }

        if (dateSlot && dateSlot.value) {
            options.data.date = dateSlot.value.replace(/[^0-9]/g, '');
        }

        GibUtil.request(options);
    }
};

/**
 * 환율 조회 callback
 *
 */
const callback = function(options, result) {

    console.info('call ExchangeRate callback');

    let amount       = 0;
    let handler      = options.handler;
    let speechOutput = Messages.NO_CURRENCYRATE;
    let amountSlot   = handler.event.request.intent.slots.AMOUNT;

    if (amountSlot && amountSlot.value) {
        amount = amountSlot.value;
    }

    if (result.data && result.data.length > 0) {

        speechOutput = GibUtil.getSpeechOutputText(Messages.EXCHANGE_RATE_DATE, result) + "<break time='0.5s'/>";

        if (amount > 0) {
            result.data.forEach(function(d) {
                d.amount = amount;
                d.convert_amt = amount * d.cash_sel_rt;
            });
            speechOutput += GibUtil.getSpeechOutputText(Messages.EXCHANGE_CONVERT, result.data);

        } else {
            speechOutput += GibUtil.getSpeechOutputText(Messages.EXCHANGE_RATE_CCY, result.data);
        }
    }

	handler.emit(':tellWithCard', speechOutput, Config.card_title, speechOutput);

    console.info('Ending ExchangeRate');
};

module.exports = handlers;