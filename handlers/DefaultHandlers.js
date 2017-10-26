'use strict';

const Messages = require('../messages/DefaultMessages');

let handlers = {
    /**
     * This is the handler for the NewSession event.
     * Refer to the  DefaultEvents.js file for more documentation.
     */
    'NewSession' : function() {
        console.info('Starting newSessionRequestHandler');

        if(this.event.request.type === 'LaunchRequest') {
            this.emit('LaunchRequest');
        } else if (this.event.request.type === 'IntentRequest') {
            this.emit(this.event.request.intent.name);
        }

        console.info('Ending newSessionRequestHandler');
    },

    /**
     * This is the handler for the LaunchRequest event. Refer to
     * the DefaultEvents.js file for more documentation.
     */
    'LaunchRequest' : function() {
        console.info('Starting launchRequestHandler');
        this.emit(':ask', Messages.WELCOME + Messages.WHAT_DO_YOU_WANT, Messages.WHAT_DO_YOU_WANT);
        console.info('Ending launchRequestHandler');
    },

    /**
     * This is the handler for the SessionEnded event. Refer to
     * the DefaultEvents.js file for more documentation.
     */
    'SessionEndedRequest' : function() {
        console.info('Starting sessionEndedRequestHandler');
        this.emit(':tell', Messages.GOODBYE);
        console.info('Ending sessionEndedRequestHandler');
    },

    /**
     * This is the handler for the Unhandled event. Refer to
     * the DefaultEvents.js file for more documentation.
     */
    'Unhandled' : function() {
        console.info('Starting unhandledRequestHandler');
        this.emit(':ask', Messages.UNHANDLED, Messages.UNHANDLED);
        console.info('Ending unhandledRequestHandler');
    },

    /**
     * This is the handler for the Amazon help built in intent.
     * Refer to the Intents.js file for documentation.
     */
    'AMAZON.HelpIntent' : function() {
        console.info('Starting amazonHelpHandler');
        this.emit(':ask', Messages.HELP, Messages.HELP);
        console.info('Ending amazonHelpHandler');
    },

    /**
     * This is the handler for the Amazon cancel built in intent.
     * Refer to the Intents.js file for documentation.
     */
    'AMAZON.CancelIntent' : function() {
        console.info('Starting amazonCancelHandler');
        this.emit(':tell', Messages.GOODBYE);
        console.info('Ending amazonCancelHandler');
    },

    /**
     * This is the handler for the Amazon stop built in intent.
     * Refer to the Intents.js file for documentation.
     */
    'AMAZON.StopIntent' : function() {
        console.info('Starting amazonStopHandler');
        this.emit(':ask', Messages.STOP, Messages.STOP);
        console.info('Ending amazonStopHandler');
    }
}

module.exports = handlers;