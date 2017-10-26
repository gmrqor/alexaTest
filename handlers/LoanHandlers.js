'use strict';

const Config   = require('../common/Config');
const GibUtil  = require('../common/GibUtil');
const Messages = require('../messages/LoanMessages');

const handlers = {

    /**
     * 대출계좌목록 조회
     *
     */
    'LoanList' : function() {

        let options = GibUtil.getRequestOptions(this, 'LoanList');

        if (!options) return;

        options.path  = 'loan/list';
        options.success = callbackList;

        let slots     = options.intent.slots;
        let dueDate   = slots.LOAN_DUE_DATE;
        let exeDate   = slots.LOAN_EXE_DT;
        let exeAmount = slots.LOAN_EXE_AMT;

        let sdate, edate, sAmt, eAmt;

        if (dueDate && dueDate.value) {
            sdate = GibUtil.getPreNextMonth(dueDate, -2);
            edate = GibUtil.getPreNextMonth(dueDate,  2);
            options.data.filter['exe_due_dt'] = '> ' + sdate + ' && < ' + edate;
        }

        if (exeDate && exeDate.value) {
            sdate = GibUtil.getPreNextMonth(exeDate, -2);
            edate = GibUtil.getPreNextMonth(exeDate,  2);
            options.data.filter['lon_exe_dt'] = '> ' + sdate + ' && < ' + edate;
        }

        if (exeAmount && exeAmount.value) {
            sAmt = exeAmount * 0.9;
            eAmt = exeAmount * 1.1;
            options.data.filter['lon_exe_amt'] = '> ' + sAmt + ' && < ' + eAmt;
        }

        GibUtil.request(options);
    },

    /**
     * 대출거래내역 조회
     *
     */
    'LoanTrx' : function() {

        let options = GibUtil.getRequestOptions(this, 'LoanTrx');

        if (!options) return;

        options.path  = 'loan/transaction';
        options.success = callbackTransaction;

        let slots        = options.intent.slots;
        let lastFourDist = slots.LAST_FOUR_DIST;
        let date         = slots.DATE;
        let sdate        = slots.START_DATE;
        let edate        = slots.END_DATE;
        let period       = slots.PERIOD;

        if (lastFourDist && lastFourDist.value) {
            options.data.acno = 'like %' + lastFourDist.value;
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
 * 대출계좌목록 조회 callback
 *
 */
const callbackList = function(options, result) {

    console.info('call LoanList callback');

    let handler       = options.handler;
    let speechOptions = {
        'firstMessage'  : Messages.LOAN_LIST_COUNT,
        'noDataMessage' : Messages.LOAN_LIST_NO_DATA
    };

    let speechOutput     = GibUtil.getResponseSpeechOutput(options, result, speechOptions);
    let speechOutputText = GibUtil.getSpeechOutputText(Messages.LOAN_LIST_AMOUNT + "<break time='0.5s'/>" + Messages.LOAN_LIST_DATE, result.data, speechOutput);

	handler.emit(':tellWithCard', speechOutputText, Config.card_title, speechOutputText);

    console.info('Ending LoanList');
};

/**
 * 대출거래내역 조회 callback
 *
 */
const callbackTransaction = function(options, result) {

    console.info('call LoanTrx callback');

    let handler       = options.handler;
    let speechOptions = {
        'firstMessage'  : Messages.LOAN_TRX_COUNT,
        'noDataMessage' : Messages.LOAN_TRX_ZERO_COUNT
    };

    let speechOutput     = GibUtil.getResponseSpeechOutput(options, result, speechOptions);
    let speechOutputText = GibUtil.getSpeechOutputText(Messages.LOAN_TRX_DATA, result.data, speechOutput);

	handler.emit(':tellWithCard', speechOutputText, Config.card_title, speechOutputText);

    console.info('Ending LoanTrx');
};

module.exports = handlers;