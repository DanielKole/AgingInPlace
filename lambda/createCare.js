'use strict';
var userID = "";


const pg = require("pg");
const config = require('./config');

const pool = new pg.Pool({
    user: config.dbUSER,
    password: config.dbPWD,
    database: config.dbDatabase,
    host: config.dbURL,
    port: config.dbPort
});

const careHandlers = {

    'CreateCare': function () {
        const cCare = this.event.request.intent;
        const userID = this.event.session.user.userId;
            console.log("userID: "+ userID);
            console.log(cCare);
            console.log(cCare.slots.ccode.value);
            this.emit('CheckCare')
    },
    'CheckCare': function () {
        var self = this;
        console.log("CheckCare launching");
        pool.connect()
        .then(client => {
            return client.query("SELECT * FROM relationship WHERE care_id = ($1)", [userID])
            .then(result => {
                console.log(result);
                this.emit(':tellWithCard', "THIS", "SHOULD", "WORK")
            })
        })
    }
}

module.exports = careHandlers;
