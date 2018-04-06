'use strict';
var token = "";
var userID = "";
var testRes = true;
var countryCode = '';
var postalCode = '';
var lat = 0;
var lng = 0;
var timeZoneId = '';
var consentToken = '';
var deviceId = '';
var apiEndPoint = '';
var googleMapApiUrl1 = '';
var googleMapApiUrl2 = '';


const pg = require("pg");
const config = require('./config');
const Alexa = require('alexa-sdk');
const das = new Alexa.services.DeviceAddressService();
const axios = require('axios');
const moment = require('moment-timezone');

const pool = new pg.Pool({
    user: config.dbUSER,
    password: config.dbPWD,
    database: config.dbDatabase,
    host: config.dbURL,
    port: config.dbPort
});

const creatingHandlers = {

  'ConfirmCreate': function () {
      var self = this;
      const intentObj = this.event.request.intent;
      userID = this.event.session.user.userId;
      consentToken = self.event.context.System.apiAccessToken;
      console.log("Consent: ", consentToken);
      deviceId = self.event.context.System.device.deviceId;
      apiEndPoint = self.event.context.System.apiEndpoint;

      das.getCountryAndPostalCode(deviceId, apiEndPoint, consentToken)
          .then((response) => {
          console.log('Response Json:\n', response);
          countryCode = response.countryCode;
          console.log("Country Code: ", countryCode);
          postalCode = response.postalCode;
          googleMapApiUrl1 = 'https://maps.googleapis.com/maps/api/geocode/json?address='+countryCode+','+postalCode+'&key='+process.env.MAP_KEY;
          axios.get(googleMapApiUrl1)
              .then(function(response) {
                  console.log('Google Api Response Json#1:\n', response);
                  lat = response.data.results[0].geometry.location.lat;
                  console.log("lat: ", lat);
                  lng = response.data.results[0].geometry.location.lng;
                  googleMapApiUrl2 = 'https://maps.googleapis.com/maps/api/timezone/json?location='+lat+','+lng+'&timestamp='+moment().unix()+'&key='+process.env.TZ_MAP_KEY;
                  axios.get(googleMapApiUrl2)
                      .then(function(response){
                          console.log('Google Api Response Json#2:\n', response);
                          timeZoneId = response.data.timeZoneId;
                          console.log("Timezone ID: ", timeZoneId);
                          const d = new moment();
                          if(intentObj.confirmationStatus !== 'CONFIRMED'){
                              const speechOutput = 'Are you sure you want to setup senior account?';
                              const cardTitle = 'Setup Senior Confirmation';
                              const cardContnet = 'Are you sure you want to setup senior account?'
                              const repromptSpeech = speechOutput;
                              self.emit(':confirmIntentWithCard', speechOutput, repromptSpeech, cardTitle. cardContnet);
                          } else {
                              self.emit('CreateRole')
                          }
                      }).catch(function(err){console.log(err)});
              }).catch(function(err){console.log(err)});
      }).catch((error) => {
              this.response.speak('I\'m sorry. Something went wrong.');
          this.emit(':responseReady');
          console.log(error.message);
      });


    },
    'CreateRole': function () {
        var self = this;
        console.log("userID: "+ userID);
        pool.connect()
        .then(client => {
            return client.query("SELECT ccode, id_num FROM seniors ORDER BY ccode DESC")
            .then(result => {
                console.log(testRes);
                if(findID(result, userID)) {
                    self.emit(':tellWithCard', 'Senior setup already been ran on this device. Please look at the alexa app to see your caregiver code.', 'Ccode Value', "This is your the caregiver code: "+token.split('').join('. '));
                } else {
                    while(testRes){
                        if(findCC(result, token)){
                            console.log("was a truey");
                            token = randomInt().toString(36);  //base36 characters.
                            console.log("token: "+ token);
                        } else {                                                                             
                            return client.query("INSERT INTO seniors (id_num, timezone, ccode) VALUES ($1, $2, $3)",[userID, timeZoneId, token])
                                .then(result => {
                                    client.release();
                                    console.log("Token success: "+ token);
                                    self.emit(':tellWithCard', 'Senior setup has been completed. Please look at the alexa app to see your caregiver code.', 'Ccode Value', "This is your the caregiver code: "+token.split('').join('. '));
                                    testRes = false;
                                }).catch(err => {
                                    console.log(err.stack);
                                });
                        }
                    }
                }
            }).catch(err => {
                client.release();
                console.log(err.stack);
            });
        });
    }
};

function randomInt () {  //returns pseudo-random number between 0 and 36^6-1;
return Math.round(Math.random() * (Math.pow(36,6)-1));
}

function findID (input, userID) {
    for(var i=0; i<input.rows.length; i++){
        console.log("Row number :"+i+"is: " +input.rows[i].id_num)
        if(userID == input.rows[i].id_num){
            console.log("Found ID!");
            token = input.rows[i].ccode;
            return true;
        }
    }
}

function findCC (input, token) {
    for(var i=0; i<input.rows.length; i++){
        console.log("Row number :"+i+"is: " +input.rows[i].ccode)
        if(token == input.rows[i].ccode || token == ""){
            console.log("Found CCode!");
            return true;
        }
    }
}

module.exports = creatingHandlers;
