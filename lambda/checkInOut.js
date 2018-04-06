
'use strict';

const moment = require('moment-timezone');


var checkInDateTime;
var checkOutDateTime;
var checkInString;
var checkOutString;
var intentObj;
var serviceName = "";
const CHECK_IN_PRE = "You have successfully checked in at:  ";
const CHECK_OUT_PRE = "You have successfully checked out at:  ";
var timeZoneId = '';
var userID = '';

const pg = require("pg");
const config = require('./config');

const pool = new pg.Pool({
    user: config.dbUSER,
    password: config.dbPWD,
    database: config.dbDatabase,
    host: config.dbURL,
    port: config.dbPort
});

const checkHandlers = {
    'CheckIn': function () {
        intentObj = this.event.request.intent;
        userID = this.event.session.user.userId;
        serviceName = intentObj.slots.Service.value.toUpperCase();
        console.log("Service: ", serviceName);
        if (intentObj.confirmationStatus !== 'CONFIRMED') {
            if (intentObj.confirmationStatus !== 'DENIED') {
                const speechOutput = "You want to check in?";
                const cardTitle = "Check In Confirmation";
                const cardContent = serviceName + ", wishes to check in?";
                const repromptSpeech = speechOutput;
                this.emit(':confirmIntentWithCard', speechOutput, repromptSpeech, cardTitle, cardContent);
            } else {
                this.emit("Okay, no problem.");
            }
        } else {
            this.emit('DoCheckIN');
        }
    },

    'OutCheck': function () {
        intentObj = this.event.request.intent;
        userID = this.event.session.user.userId;
        serviceName = intentObj.slots.Service.value.toUpperCase();
        console.log("Service: ", serviceName);
        if (intentObj.confirmationStatus !== 'CONFIRMED') {
            if (intentObj.confirmationStatus !== 'DENIED') {
                const speechOutput = "You want to check out?";
                const cardTitle = "Check Out Confirmation";
                const cardContent = serviceName + ", wishes to check out?";
                const repromptSpeech = speechOutput;
                this.emit(':confirmIntentWithCard', speechOutput, repromptSpeech, cardTitle, cardContent);
            } else {
                this.emit("Okay, no problem.");
            }
        } else {
            this.emit('DoCheckOut');
        }
    },

    'DoCheckIN': function () {
        var self = this;
        const cardTitle = 'Care Hub: Check In';
        console.log("userID: "+ userID);

        pool.connect().then(client => {
            return client.query("SELECT timezone FROM seniors WHERE id_num = $1", [userID])
            .then(result => {
                console.log("results: "+ result.rows[0].timezone);
                if (result.rows[0].timezone){
                    timeZoneId = result.rows[0].timezone;
                    console.log("Timezone:  "+ timeZoneId);
                    return client.query("INSERT INTO checkins (id_num, check_in, service_name) VALUES($1, $2, $3) RETURNING check_in", [userID, 'NOW()', serviceName])
                    .then(result => {
                        client.release();
                        checkInDateTime = moment(result.rows[0].check_in);
                        checkInString = checkInDateTime.tz(timeZoneId).format('llll');  //Example:  Sun, Apr 1, 2018 5:49 PM
                        const cardText = serviceName +" has checked in at:\n"+ checkInString;
                        const speechOutput = CHECK_IN_PRE + checkInString;
                        self.emit(':tellWithCard', speechOutput, cardTitle, cardText);
                    }).catch(err => {
                        console.log(err.stack);
                        self.response.speak('Sorry there was an error.  Please try again.');
                        self.emit(':responseReady');
                    });   
                } else {
                    self.response.speak('It appears that Senior Setup has not been run on this device yet.  Please do so before trying to Check In or Out.');
                    self.emit(':responseReady');
                }
            }).catch(err => {
                console.log(err.stack);
                self.response.speak('Sorry there was an error.  Please try again.');
                self.emit(':responseReady');
            });
        }).catch(err => {
            console.log(err.stack);
            self.response.speak('Sorry there was an error.  Please try again.');
            self.emit(':responseReady');
        });   
    },

    'DoCheckOut': function () {
        var self = this;
        var sid = 0;  //serial id of the check in/out instance
        const cardTitle = 'Care Hub: Check Out';
        console.log("userID: "+ userID);
        serviceName = intentObj.slots.Service.value.toUpperCase();
        pool.connect().then(client => {
            return client.query("SELECT * FROM senior_check_view WHERE service_name = $1 AND id_num= $2 ORDER BY serial_id DESC", [serviceName, userID])
            .then(result => {
                if (result.rows.length > 0){ //checking to see if any check_ins happened with that service name.
                    checkOutDateTime = moment();
                    var duration = moment.duration(checkOutDateTime.diff(checkInDateTime));
                    var mins = Math.ceil(duration.asMinutes());  //rounding duration of service up.
                    checkInDateTime = moment(result.rows[0].check_in); 
                    if (result.rows[0].check_out == null){   //checking to see a check out hasn't already been performed.
                        console.log("results: "+ result.rows[0].timezone);
                        sid = result.rows[0].serial_id; 
                        timeZoneId = result.rows[0].timezone;
                        console.log("Timezone:  "+ timeZoneId);
                        return client.query("UPDATE checkins SET check_out = $1, duration = $2 WHERE serial_id = $3", [checkOutDateTime, mins, sid])
                        .then(result => {
                            checkOutString = checkOutDateTime.tz(timeZoneId).format('llll');  //Example:  Sun, Apr 1, 2018 5:49 PM
                            const cardText = serviceName +" has checked out at:\n"+ checkOutString +"\nDuration: "+ mins +" minutes.";
                            const speechOutput = CHECK_OUT_PRE + checkOutString;
                            self.emit(':tellWithCard', speechOutput, cardTitle, cardText);
                        }).catch(err => {
                            console.log(err.stack);
                            self.response.speak('Sorry there was an error.  Please try again.');
                            self.emit(':responseReady');
                        });   
                    } else if (mins > 1440) {  //checking to see if the last check_in was today.
                        self.response.speak("Sorry it doesn't look like you checked in today, please remember to check in next time.");
                        self.emit(':responseReady');
                    } else {
                        self.response.speak("Sorry it appears you have already checked out.");
                        self.emit(':responseReady');
                    }
                } else {
                    self.response.speak("Sorry it doesn't look like you checked in today, please remember to check in next time.");
                    self.emit(':responseReady');
                }
            }).catch(err => {
                console.log(err.stack);
                self.response.speak('Sorry there was an error.  Please try again.');
                self.emit(':responseReady');
            });
        }).catch(err => {
            console.log(err.stack);
            self.response.speak('Sorry there was an error.  Please try again.');
            self.emit(':responseReady');
        });   
    }
};

module.exports = checkHandlers;