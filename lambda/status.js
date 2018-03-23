'use strict';

const pg = require("pg");
const config = require('./config');
const moment = require('moment');

const pool = new pg.Pool({
    user: config.dbUSER,
    password: config.dbPWD,
    database: config.dbDatabase,
    host: config.dbURL,
    port: config.dbPort
});

const statusHandlers = {
    'KPositiveIntent': function () {
        const cardTitle = 'Care Hub: Positive Status';
        const speechOutput = 'Hurray! Glad to hear that Susan arrived on time!';
        const cardContent = 'Hurray! Glad to hear that Susan arrived on time!';
        
        const imageObj = {
        	smallImageUrl: 'https://i.imgur.com/7ZR0GPp.jpg',
        	largeImageUrl: 'https://i.imgur.com/7ZR0GPp.jpg'
        };
        
        this.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
    },
    
    'KNegativeIntent': function () {
        const self = this;
        
        const cardTitle = 'Care Hub: Negative Status';
        const speechOutput = 'Shame! I have noted that Susan was late today!';
        const cardContent = 'Shame! I have noted that Susan was late today!';
        
        const imageObj = {
        	smallImageUrl: 'https://i.imgur.com/pQ8wWLj.png',
        	largeImageUrl: 'https://i.imgur.com/pQ8wWLj.png'
        };
        
        self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
    },
    
    'KReportIntent': function () {
        const self = this;
        
        var senior_id_num = '';
        var mood_value = '';
        var mood_when_was_it = '';
        var mood_when_was_it_moment = '';        
        var mood_when_was_it_alexa = '';
        
        pool.connect((err, client, release) => {
            if (err) {
              return console.error('Error acquiring client', err.stack);
            }
            
            client.query("SELECT * FROM seniors", (err, result) => {
                if (err) {
                    return console.error('Error executing query', err.stack);
                }
                
                console.log('SENIORS Result Row: ' + result.rows);
                senior_id_num = result.rows[0].id_num;
                console.log('ID Num: ' + senior_id_num);
                
                client.query("SELECT * FROM moods WHERE id_num = ($1)", [senior_id_num], (err, result) => {
                    release();

                    if (err) {
                        return console.error('Error executing query', err.stack);
                    }

                    console.log('Reading Mood of: ' + senior_id_num);
                    console.log('MOODS Result Rows: ' + result.rows);
                    mood_value = result.rows[0].value;
                    mood_when_was_it = result.rows[0].whenwasit;
                    console.log('Mood Value: ' + mood_value);
                    console.log('Mood Time TIMESTAMP: ' + mood_when_was_it);
                    
                    // 2018-01-09 14:50:00
                    mood_when_was_it_moment = moment(mood_when_was_it).format("YYYY-MM-DD HH:mm:ss");
                    console.log('Mood Time STRING: ' + mood_when_was_it_moment);
//                    console.log('Mood Time STRING type: ' + typeof mood_when_was_it_moment);
                    
                    mood_when_was_it_alexa = moment(mood_when_was_it_moment).format('MMM Do YYYY hh:mmA');

                    const cardTitle = 'Care Hub: Status Report';

                    var speechOutput = 'Please check your Alexa app for the Status Report!';
//                    console.log('Type of Speech Output ' + typeof speechOutput);

                    const cardContent = 'On ' + mood_when_was_it_alexa + ', ' + 'the most recent mood expressed was: ' + mood_value;

                    const imageObj = {
                        smallImageUrl: 'https://bit.ly/2ttwpXV',
                        largeImageUrl: 'https://bit.ly/2ttwpXV'
                    };

                    self.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
                });
            })
        });
    }
};

module.exports = statusHandlers;