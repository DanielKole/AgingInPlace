'use strict';

const mainHandlers = {
    'LaunchRequest': function () {
        this.response.speak('Hello. Welcome to Grace Care, how may I assist you?').listen();
        
        this.emit(':responseReady');
    },

    'AMAZON.HelpIntent': function () {
        const speechOutput = 'This skill allows you to tell me your moods, status, and do check ins and check outs.';
        const reprompt = 'Tell me how you are feeling.';

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak('Goodbye!');
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak('See you later!');
        this.emit(':responseReady');
    }
};

module.exports = mainHandlers;