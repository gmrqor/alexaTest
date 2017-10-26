'use strict';

const Config   = require('../common/Config');
const GibUtil  = require('../common/GibUtil');
const Messages = require('../messages/CommonMessages');

const handlers = {

    /**
     * Personal Key Setting Intent
     */
    'SetPersonalKey' : function() {

        console.info('Starting SetPersonalKey');

        let persnalKey = this.event.request.intent.slots.PERSONAL_KEY.value;
        let preIntent  = this.attributes['preIntent'];
        let statusCode = this.attributes['status'];

        if (statusCode != GibUtil.statusCode['SET_PERSONAL_KEY']) {
            this.emit(':askWithCard', Messages.TRY_AGAIN, Messages.TRY_AGAIN, Config.card_title, Messages.TRY_AGAIN);
            return;
        }

        if (!persnalKey) {
            this.emit(':askWithCard', Messages.INVALIDATE_PERSONALKEY, Messages.PERSONALKEY_INFO, Config.card_title, Messages.INVALIDATE_PERSONALKEY);
            return;
        }

        if (!preIntent) {
            this.emit(':askWithCard', Messages.INVALIDATE_PREINTENT, Messages.INVALIDATE_PREINTENT, Config.card_title, Messages.INVALIDATE_PREINTENT);
            return;
        }

        this.attributes['personalKey'] = persnalKey;
        this.emit(preIntent.name, preIntent.slots);

        console.info('Ending SetPersonalKey');
    },

    /**
     * Yes Setting Intent
     */
    'SetYes' : function() {

        console.info('Starting SetYes');

        let preIntent  = this.attributes['preIntent'];
        let statusCode = this.attributes['status'];

        if (statusCode != GibUtil.statusCode['HAS_MORE_PAGE']) {
            this.emit(':askWithCard', Messages.TRY_AGAIN, Messages.TRY_AGAIN, Config.card_title, Messages.TRY_AGAIN);
            return;
        }

        if (!preIntent) {
            this.emit(':askWithCard', Messages.INVALIDATE_PREINTENT, Messages.INVALIDATE_PREINTENT, Config.card_title, Messages.INVALIDATE_PREINTENT);
            return;
        }

        this.emit(preIntent.name, preIntent.slots);

        console.info('Ending SetYes');
    },

    /**
     * No Setting Intent
     */
    'SetNo' : function() {

        console.info('Starting SetNo');

        GibUtil.clearSessionAttributes(this);
        this.emit(':askWithCard', Messages.YESNO_IS_NO, Messages.YESNO_IS_NO, Config.card_title, Messages.YESNO_IS_NO);

        console.info('Ending SetNo');
    },

    /**
     * 신한은행 정보조회
     */
    'ShinhanInfo' : function () {

        GibUtil.clearSessionAttributes(this);
        this.emit(':askWithCard', Messages.SHINHAN_INFO, '', Messages.SHINHAN_TITLE, Messages.SHINHAN_INFO);
    },

    /**
     * 신한은행 지점조회
     */
    'BranchInfo' : function() {

        let speechOutput = Messages.BRANCH_INFO + Messages.BRANCH_GUIDE;

        GibUtil.clearSessionAttributes(this);
        this.emit(':askWithCard', speechOutput, '', Messages.SHINHAN_TITLE, speechOutput);
    },

    /**
     * 신한은행 지점 상세조회
     */
    'BranchDetail' : function() {

        const branches = {
            'manhattan' : {
                'address': '313 Fifth AVE New York, 10016',
                'hour'   : 'Monday to Friday  09:00am  to 5:00pm',
                'telno'  : '646-843-7333'
            },
            'new york' : {
                'address': '330 Fifth AVE 4FL New York,10001',
                'hour'   : 'Monday to Friday  09:00am  to 5:00pm',
                'telno'  : '646-843-7300'
            }
        };

        let branch       = this.event.request.intent.slots.BRANCH_NAME.value.toLowerCase();
        let branchInfo   = branches[branch];
        let speechOutput = Messages.BRANCH_NOT_EXIST + Messages.BRANCH_INFO;

        if (branchInfo) {
            let address = branchInfo.address;
            let hour    = branchInfo.hour;
            let telno   = branchInfo.telno;

            speechOutput = branch + " branch is located at " + address + "<break time='0.1s'/>"
                         + "It is open " + hour + "<break time='0.1s'/>"
                         + "telephone number is " + telno;
        }

        GibUtil.clearSessionAttributes(this);
        this.emit(':askWithCard', speechOutput, '', CommonMessages.SHINHAN_TITLE, '');
    }
};

module.exports = handlers;