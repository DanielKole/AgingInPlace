'use strict';

//packages
const Alexa = require('alexa-sdk');
const pg = require("pg");

//imports
const config = require('./lambda/config');
const mainHandlers = require('./lambda/main');
const checkHandlers = require("./lambda/checkInOut");
const moodHandlers = require("./lambda/moods");
const statusHandlers = require("./lambda/status");
const creatingHandlers = require("./lambda/createRole");

//handler
exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = config.appId;
    const pool = new pg.Pool({
        user: config.dbUSER,
        password: config.dbPWD,
        database: config.dbDatabase,
        host: config.dbURL,
        port: config.dbPort
    });
    context.callbackWaitsForEmptyEventLoop = false;
    alexa.registerHandlers(mainHandlers, checkHandlers, moodHandlers, statusHandlers, creatingHandlers);
    alexa.execute();
};