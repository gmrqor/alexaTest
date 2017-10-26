'use strict';

const Config   = require('../common/Config');
const GibUtil  = require('../common/GibUtil');
const Messages = require('../messages/AccountMessages');

const handlers = {

    /**
     * 예금계좌목록 조회
     *
     */
    'AccountList' : function() {

        let options = GibUtil.getRequestOptions(this, 'AccountList');

        if (!options) return;

        options.path  = 'account/list';
        options.success = callbackList;

        let slots        = options.intent.slots;
        let accountType  = slots.ACCOUNT_TYPE;
        let lastFourDist = slots.LAST_FOUR_DIST;

        if (accountType && accountType.value) {
            options.data.filter['dep_prdt_nm'] = 'like %' + (accountType.value == 'checking account' ? 'CHECKING' : 'saving') + '%';
        }

        if (lastFourDist && lastFourDist.value) {
            options.data.filter['lcl_ac_no'] = 'like %' + lastFourDist.value;
        }

        // sort 테스트
        options.data.sort = "lcl_ac_no desc";        

        GibUtil.request(options);
    },

    /**
     * 예금거래내역 조회
     *
     */
    'AccountTrx' : function() {

        let options = GibUtil.getRequestOptions(this, 'AccountTrx');

        if (!options) return;

        options.path  = 'account/transaction';
        options.success = callbackTransaction;

        let slots   = options.intent.slots;
        let trxType = slots.TRX_TYPE;
        let date    = slots.DATE;
        let sdate   = slots.START_DATE;
        let edate   = slots.END_DATE;
        let period  = slots.PERIOD;

        if (trxType && trxType.value) {
            options.data.filter['dep_trx_rnp_d'] = (trxType.value == 'debit' ? 'D' : 'C');
        }

        if (date && date.value) {
            options.data.sdate = date.value.replace(/[^0-9]/g, '');
            options.data.edate = options.data.sdate;
        }

        if (sdate && sdate.value) {
            options.data.sdate = sdate.value.replace(/[^0-9]/g, '');
        }

        if (edate && edate.value) {
            options.data.edate = edate.value.replace(/[^0-9]/g, '');
        }

        if (period && period.value) {
            options.data.sdate = GiobUtil.dayFromIsoDuration(period);
        }

        GibUtil.request(options);
    }
};

/**
 * 계좌목록 조회 callback
 *
 */
const callbackList = function(options, result) {

    console.info('call AccountList callback');

    let handler       = options.handler;
    let speechOptions = {
        'firstMessage'  : Messages.ACCOUNT_LIST_GUIDE,
        'noDataMessage' : Messages.ACCOUNT_LIST_NO_DATA
    };

    let speechOutput     = GibUtil.getResponseSpeechOutput(options, result, speechOptions);
    let speechOutputText = GibUtil.getSpeechOutputText(Messages.ACCOUNT_LIST_GRID_DATA, result.data, speechOutput);

	handler.emit(':tellWithCard', speechOutputText, Config.card_title, speechOutputText);

    console.info('Ending AccountList');
};

/**
 * 거래내역 조회 callback
 *
 */
const callbackTransaction = function(options, result) {

    console.info('call AccountTrx callback');

    let handler       = options.handler;
    let speechOptions = {
        'firstMessage'  : Messages.ACCOUNT_TRX_COUNT,
        'noDataMessage' : Messages.ACCOUNT_TRX_ZERO_COUNT
    };

    let speechOutput     = GibUtil.getResponseSpeechOutput(options, result, speechOptions);
    let speechOutputText = GibUtil.getSpeechOutputText(Messages.ACCOUNT_TRX_DATA, result.data, speechOutput);

	handler.emit(':tellWithCard', speechOutputText, Config.card_title, speechOutputText);

    console.info('Ending AccountTrx');
};

module.exports = handlers;