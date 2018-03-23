'use strict';

//packages
const axios = require('axios');
const moment = require('moment-timezone');



//variables and constants
var checkInDateTime;
var checkOutDateTime;

//The following will be moved to senior setup.
var countryCode = '';
var postalCode = '';
var lat = 0;
var lng = 0;
var city = '';
var state = '';
var timeZoneID = '';
var userID = '';
var consentToken = '';
var deviceId = '';

const CHECK_IN_PRE = "You have successfully checked in at:  ";
const CHECK_OUT_PRE = "You have successfully checked out at:  ";

const checkHandlers = {
    'CheckIn': function () {
        this.emit('DoCheckIN');
    },

    'OutCheck': function () {
        this.emit('DoCheckOut');
    },

    'DoCheckIN': function () {
        var self = this;
        consentToken = this.event.context.System.apiAccessToken;
        console.log("Consent: ", consentToken);
        deviceId = this.event.context.System.device.deviceId;
        axios.get('https://api.amazonalexa.com/v1/devices/${deviceId}/settings/address/countryAndPostalCode', {
            headers: { 'Authorization': 'Bearer ${consentToken}' }
        }).then(function(response) {
            countryCode = response.data.countryCode;
            console.log("Country Code: ", countryCode);
            postalCode = response.data.postalCode;

            axios.get('https://maps.googleapis.com/maps/api/geocode/json?address=${countryCode},${postalCode}&key=${process.env.MAP_KEY}')
            .then(function(response) {
                lat = response.data.results[0].geometry.location.lat;
                console.log("lat: ", lat);
                lng = response.data.results[0].geometry.location.lng;

                axios.get('https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${moment().unix()}&key=${process.env.MAP_KEY}')
                .then(function(response){
                    timeZoneID = response.data.timeZoneId;
                    const d = new moment();
                    checkInDateTime = currDate.tz(timeZoneId).format('YYYY-MM-DD HH:mm');
                    const cardTitle = 'Care Hub: Check In';

                    const checkInDateString = checkInDateTime.toString();
                    const cardText = "Checked in at:\n"+ checkInDateString;

                    const speechOutput = CHECK_IN_PRE + checkInDateString;
                    self.emit(':tellWithCard', speechOutput, cardTitle, cardText);
                }).catch(function(err){console.log(err)});
            }).catch(function(err){console.log(err)});
        }).catch(function(err){console.log(err)});
    },

    'DoCheckOut': function () {
        const cardTitle = 'Care Hub: Check Out';
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() *60000);
        checkOutDateTime = new Date(utc + (3600000*offset));
        const checkOutDateString = checkOutDateTime.toString().slice(0,21);  //only first 21 characters of date
        const cardText = "Checked out at:\n"+checkOutDateString;
        
        const speechOutput = CHECK_OUT_PRE + checkOutDateString;
        this.emit(':tellWithCard', speechOutput, cardTitle, cardText); 
    }
};

module.exports = checkHandlers;