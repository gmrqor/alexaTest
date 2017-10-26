'use strict';

const Https           = require('https');
const xml2js          = require('xml2js');
const queryString     = require('querystring');

const Config          = require('../common/Config');
const DefaultMessages = require('../messages/DefaultMessages');
const CommonMessages  = require('../messages/CommonMessages');

const GibUtil = {

    /**
     * alexa 현재 상태 코드
     *
     */
    'statusCode' : {
        'SET_PERSONAL_KEY' : 'setPersonalKey',
        'HAS_MORE_PAGE'    : 'hasMorePage'
    },

    /**
     * HTTPS ajax 통신처리
     *
     */
    'request' : function(options) {

        console.log(options.data);

        const type      = options.type || Config.type;
        let contentType = 'application/x-www-form-urlencoded';
        let sendData    = null;

        if (options.data.filter && Object.keys(options.data.filter).length == 0) {
            delete options.data.filter;
        }

        if (!options.data.sort) {
            delete options.data.sort;
        }

        if (type == 'json') {
            contentType = 'application/json';
            sendData    = JSON.stringify(options.data);

        } else if (type == 'xml') {
            contentType = 'application/xml';
            sendData    = options.data;

        } else {
            sendData = queryString.stringify(options.data);
        }

        if (!options.success || typeof options.success != 'function') {
            options.success = function(){};
        }

        if (!options.error || typeof options.error != 'function') {
            // 기본 error 처리 함수
            options.error = function(options, res) {
                let handler = options.handler;

                if (res && res.name && res.name.indexOf('Error') > 0) { // error
                    handler.emit(':tellWithCard', DefaultMessages.ERROR, Config.card_title, DefaultMessages.ERROR);

                } else { // response
                    switch(res.statusCode) {
                        case 204:
                            handler.emit(':tellWithCard', DefaultMessages.NO_DATA, Config.card_title, DefaultMessages.NO_DATA);
                            break;
                        case 403:
                            handler.emit(':tellWithPermissionCard', DefaultMessages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);
                            break;
                        default:
                            handler.emit(':askWithCard', DefaultMessages.GLOBAL_API_FAILURE, '', Config.card_title, DefaultMessages.GLOBAL_API_FAILURE);
                    }
                }
            };
        }

        let httpOptions = {
            host    : options.host   || Config.host,
            method  : options.method || Config.method,
            path    : Config.path + options.path,
            headers : {
                'Content-Type' : contentType
            }
        };

        if (options.accessToken) {
            httpOptions.headers['X-GLOBAL-ClientId']     = Config.client_id;
            httpOptions.headers['X-GLOBAL-ClientSecret'] = Config.client_secret;
            httpOptions.headers['X-GLOBAL-AccessToken']  = options.accessToken;

            if (options.personKey) {
                httpOptions.headers['X-GLOBAL-PersonalKey'] = options.personKey;
            }
        }

        const req = Https.request(httpOptions, (res) => {

            let result, err;
            let resData = '';
            res.setEncoding('utf8');

            res.on('data', (chunk) => {
                resData += chunk;
            });

            res.on('end', () => {

                console.log(res.statusCode + '-->' + resData);

                if (res.statusCode == 200) {
                    if (Config.dataType == 'json') {
                        try {
                            result = JSON.parse(resData);
                        } catch(e) {
                            err = e;
                        }

                        if (err) {
                            options.error(options, err);
                        } else {
                            options.success(options, result);
                        }

                    } else if (Config.dataType == 'xml') {
                        // xml로 사용할 경우
                        //let parser = new DOMParser();
                        //let doc = parser.parseFromString(resData, 'text/xml');
                        //options.success(options.handler, doc);

                        // json 변환
                        xml2js.parseString(resData, function(err, result) {
                            if (err) {
                                options.error(options, err);
                            } else {
                                options.success(options, result);
                            }
                        });

                    } else {
                        options.success(options, resData);
                    }

                } else {
                    options.error(options, res);
                }
            });

        }).on('error', (e) => {
            console.log('request error-->' + e.message);
            options.error(options, e);
        });

        console.log(options.path + (sendData ? '-->' + sendData : ' send'));

        req.write(sendData);
        req.end();
    },

    /**
     * HTTPS ajax 통신 전처리 및 설정정보 조회
     *
     */
    'getRequestOptions' : function(handler, handlerName) {

        let intentName = handler.event.request.intent.name;
        console.info('Starting ' + handlerName + ' : ' + intentName);

        // 현재 handler 가 preIntent 가 아닐 경우 세션 속성 초기화
        if (intentName == handlerName) {
            GibUtil.clearSessionAttributes(handler);
        }

        let pageNo = 1;
        let pageSize = Config.defaultPageSize;

        let pageInfo    = handler.attributes['page'];
        let sort        = handler.attributes['sort'];
        let filter      = handler.attributes['filter'];
        let preIntent   = handler.attributes['preIntent'];
        let personalKey = handler.attributes['personalKey'];
        let accessToken = handler.event.session.user.accessToken;
        let intent      = preIntent ? preIntent : handler.event.request.intent;

        if (!accessToken) {
            handler.attributes = {};
            handler.emit(':askWithCard', CommonMessages.ERROR_NO_0005, CommonMessages.TRY_AGAIN, Config.card_title, CommonMessages.ERROR_NO_0005);
            return false;
        }

        if (!personalKey) {
            handler.attributes['status'] = this.statusCode['SET_PERSONAL_KEY'];
            handler.attributes['preIntent'] = intent;
            handler.emit(':askWithCard', CommonMessages.WHAT_IS_YOUR_PERSONALKEY, CommonMessages.WHAT_IS_YOUR_PERSONALKEY, Config.card_title, CommonMessages.WHAT_IS_YOUR_PERSONALKEY);
            return false;
        }

        if (pageInfo) {
            pageNo = pageInfo.no || 1;
            pageSize = pageInfo.size || Config.defaultPageSize;
        }

        if (!filter || typeof filter != 'object') {
            filter = {};
        }

        return {
            'handler'     : handler,
            'intent'      : intent,
            'accessToken' : accessToken,
            'personKey'   : personalKey,
            'data'        : {
                                'filter' : filter,
                                'sort'   : sort,
                                'page'   : {
                                    'no'   : pageNo,
                                    'size' : pageSize
                                }
                            }
        };
    },

    /**
     * HTTPS ajax 통신결과로 speech 문자열 조회
     *
     */
    'getResponseSpeechOutput' : function(options, result, speechOutputOptions) {

        let data         = result.data;
        let returnCode   = result.returnCode;
        let handler      = options.handler;
        let preIntent    = handler.attributes['preIntent'];
        let speechOutput = {
            'startNum'      : 0,    // ordinal 시작값
            'firstMessage'  : null, // 결과조회시 가장 먼저 출력할 문자열 (처음 한 번만 실행)
            'noDataMessage' : null, // 결과 값이 없을 경우 출력할 문자열
            'errorMessage'  : null, // 에러발생시 문자열
            'beginMessage'  : null, // 결과 문자열 이전에 출력할 문자열
            'endMessage'    : null  // 결과 문자열 뒤에 출력할 문자열
        };

        if (returnCode && returnCode != Config.successReturnCode) { // 오류응답코드

            if(returnCode == '2') { // Access Token 오류
                speechOutput.errorMessage = CommonMessages.ERROR_NO_0002;

            } else if(returnCode == '3') { // 개인인증키 오류
                speechOutput.errorMessage = CommonMessages.ERROR_NO_0003;
                handler.attributes['personalKey'] = null;
                handler.attributes['status']      = this.statusCode['SET_PERSONAL_KEY'];
                handler.attributes['preIntent']   = preIntent ? preIntent : handler.event.request.intent;

            } else if(returnCode == '5') { // Access Token 만료
                speechOutput.errorMessage = CommonMessages.ERROR_NO_0005;

            } else { // 기타 오류
                speechOutput.errorMessage = CommonMessages.ERROR_NO_0009;
            }

            // handler.emit(':askWithCard', speechOutput, CommonMessages.TRY_AGAIN, Config.card_title, speechOutput);

        } else if (data && data.length > 0) {

            if (speechOutputOptions.beginMessage) {
                speechOutput.beginMessage = this.getSpeechOutputText(speechOutputOptions.beginMessage, result);
            }

            result.total = 0;
            result.pageSize = Config.defaultPageSize;

            if (result.page) {
                let pageNo   = result.page.no;
                let pageSize = result.page.size;
                let total    = result.page.total;
                let left     = total - (pageNo * pageSize);

                result.pageSize = pageSize;
                result.total    = total;
                result.left     = left;

                speechOutput.startNum = (Number(pageNo) - 1) * Number(pageSize) + 1; // ordinal 시작값

                if (pageNo == 1 && speechOutputOptions.firstMessage) {
                    speechOutput.firstMessage = this.getSpeechOutputText(speechOutputOptions.firstMessage, result);
                }

                if (left > 0) {
                    speechOutput.endMessage = this.getSpeechOutputText(speechOutputOptions.endMessage || CommonMessages.CONTINUE_MORE_PAGE, result);

                    result.page.no++;
                    handler.attributes['page']   = result.page;
                    handler.attributes['status'] = this.statusCode['HAS_MORE_PAGE'];
                    handler.attributes['preIntent'] = preIntent ? preIntent : handler.event.request.intent;

                    if (options.data) {
                        handler.attributes['sort']   = options.data.sort;
                        handler.attributes['filter'] = options.data.filter;
                    }

                } else if (speechOutputOptions.endMessage) {
                    speechOutput.endMessage = this.getSpeechOutputText(speechOutputOptions.endMessage, result);
                }

            } else if (speechOutputOptions.endMessage) {
                speechOutput.endMessage = this.getSpeechOutputText(speechOutputOptions.endMessage, result);
            }

        } else {
            speechOutput.noDataMessage = speechOutputOptions.noDataMessage || CommonMessages.NO_RESULT_DATA;
        }

        return speechOutput;
    },

    /**
     * ISO 8601 포맷을 날짜로 변환
     *
     */
    'dayFromIsoDuration' : function(duration) {

        let date = new Date()
        let regex = /P((([0-9]*\.?[0-9]*)Y)?(([0-9]*\.?[0-9]*)M)?(([0-9]*\.?[0-9]*)W)?(([0-9]*\.?[0-9]*)D)?)?(T(([0-9]*\.?[0-9]*)H)?(([0-9]*\.?[0-9]*)M)?(([0-9]*\.?[0-9]*)S)?)?/;
        let matches = duration.match(regex);

        let years  = Number(matches[3]);
        let months = Number(matches[5]);
        let weeks  = Number(matches[7]);
        let days   = Number(matches[9]);

        if (years)  date.setYear(date.getFullYear() + years);
        if (months) date.setMonth(date.getMonth() + months);
        if (weeks)  date.setDate(date.getDate() + (weeks * 7));
        if (days)   date.setDate(date.getDate() + days);

        let y = date.getFullYear();
        let m = date.getMonth() + 1;
        let d = date.getDate();

        return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d;
    },

    /**
     * 월 계산
     *
     */
    'getPreNextMonth' : function(dateStr, month) {

        let date, y, m, d;

        try {
            dateStr = dateStr.value.replace(/[^0-9]/g, '');
            y = Number(dateStr.substr(0, 4));
            m = Number(dateStr.substr(4, 2)) - 1;
            d = Number(dateStr.substr(6, 2));
            date = new Date(y, m, d);
        } catch(e) {
            date = new Date();
        }

        date.setMonth(date.getMonth() + Number(month));

        y = date.getFullYear();
        m = date.getMonth() + 1;
        d = date.getDate();

        return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d;
    },

    /**
     * 세션 속성 초기화
     *
     */
    'clearSessionAttributes' : function(handler) {

        for (let key in handler.attributes) {
            handler.attributes[key] = null;
        }
    },

    /**
     * Alexa 출력 메세지 포맷 적용
     * This is ${abc} and ... --> This is TEXT01 and ...
     *
     */
    'getSpeechOutputText' : function(message, data, speechOutput) {

        let arr = null;
        let startNum = 1;
        let speechOutputText = '';

        if (speechOutput) {
            if (speechOutput.errorMessage) { // 에러 메세지가 존재할 경우
                return speechOutput.errorMessage;
            }
            if (speechOutput.noDataMessage) { // 데이터가 없을 경우
                return speechOutput.noDataMessage;
            }
            if (speechOutput.firstMessage) { // 첫 출력 메세지가 존재할 경우
                speechOutputText += speechOutput.firstMessage + "<break time='0.5s'/>";
            }
            startNum = speechOutput.startNum;
        }

        if (data instanceof Array) {
            arr = data;
        } else {
            arr = [];
            arr[0] = data;
        }

        for (let i in arr) {
            if (i > 0) {
                speechOutputText += "<break time='0.5s'/>";
            }
            arr[i]['ordinal'] = Number(i) + Number(startNum);
            speechOutputText += message.replace(/\$\{\S+\}/gm, function(w, m) {
                let key = w.substring(2, w.length - 1);
                return getSpeechOutputFormat(key, arr[i][key], w);
            });
        }

        if (speechOutput) {
            if (speechOutput.beginMessage) {
                speechOutputText = speechOutput.beginMessage + "<break time='0.5s'/>" + speechOutputText;
            }
            if (speechOutput.endMessage) {
                speechOutputText += "<break time='0.5s'/>" + speechOutput.endMessage;
            }
        }

        return speechOutputText;
    }
};

/**
 * Format Type 별로 구별해서 문자열 포맷 적용
 *
 */
const getSpeechOutputFormat = function(key, value, defaultValue) {

    if (!value) return defaultValue;

    // Format Type 항목
    const speechOutputFormatType = {
        'date'      : 'ttype_due_dt, ntfct_dt, oprt_dt, lon_exe_dt, exe_due_dt, trx_dt',
        'amount'    : 'pabl_blc, dep_ac_ledg_trx_amt, cash_sel_rt, dep_ac_blc, lon_exe_amt, stccy_trx_samt',
        'fourDigit' : 'lcl_ac_no, lon_acno',
        'ordinal'   : 'ordinal'
    };

    let type, returnValue;

    for (let t in speechOutputFormatType) {
        let arr = speechOutputFormatType[t].split(/\s*,\s*/);
        if (arr.indexOf(key) >= 0) {
            type = t;
            break;
        }
    }

    switch (type) {
        case 'date' : // 날짜
            returnValue = "<say-as interpret-as='date'>" + value + "</say-as>";
            break;
        case "amount" : // 금액
            returnValue = "<say-as interpret-as='digits'>" + (Math.round((value * 1000))/1000) + "</say-as>";
            break;
        case "fourDigit" : // 마지막 4자리 숫자
            returnValue = "<say-as interpret-as='number'>" + (value.length > 4 ? value.substring(value.length - 4) : value) + "</say-as>";
            break;
        case "ordinal" : // 서수형
            returnValue = "<say-as interpret-as='ordinal'>" + value + "</say-as>";
            break;
        default :
            returnValue = value;
    }

    return returnValue;
};

module.exports = GibUtil;