'use strict';

const pg = require("pg");
const config = require('./config');

const pool = new pg.Pool({
    user: config.dbUSER,
    password: config.dbPWD,
    database: config.dbDatabase,
    host: config.dbURL,
    port: config.dbPort
});

const cardMoods = {
    happy: 'https://i.imgur.com/We7OlAD.png',
    neutral: 'https://i.imgur.com/0de3NQz.png',
    sad: 'https://i.imgur.com/w0YWq8n.png'
}

const moodHandlers = {
    'InputMood': function () {
        
        var self = this;
        //use this for live
        var usrID = this.event.session.user.userId;
        //use this for testing
        //var usrID = "abcdefghijklmnopqrstuvwxyz0123456789";

        const intentObj = this.event.request.intent;
        //moodVal is used to put the actual slot value in to the DB ie Happy, Neutral, Sad
        var moodVal = intentObj.slots.mood.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        //moodText is to use the exact word the user uses to display ie Glad, Cheerful, Amazing
        var moodText = intentObj.slots.mood.value;

        pool.connect().then(client => {
            return client.query("SELECT * FROM seniors WHERE id_num = $1", [usrID])
            .then(result => {
                if (result.rows[0]){
                    if(intentObj.confirmationStatus !== 'CONFIRMED'){
                        const speechOutput = 'Is this how you are feeling: ' + moodText + '?';
                        const cardTitle = 'State Mood Confirmation';
                        const cardContent = 'Is this how you are feeling ' + moodText + '?';
                        const repromptSpeech = "So you are feeling " + moodText + ", correct?";
                        this.emit(':confirmIntentWithCard', speechOutput, repromptSpeech, cardTitle. cardContent);
                    } else {
                        moodVal = intentObj.slots.mood.resolutions.resolutionsPerAuthority[0].values[0].value.name;
                        pool.connect((err, client, release) => {
                            client.query("INSERT INTO moods (value, whenwasit, id_num) VALUES ($1, NOW(), $2)", [moodVal, usrID], (err, result) => {
                                release();
                                if (err) {
                                return console.error('Error executing query', err.stack)
                                }
        
                                var cardTitle = "Thank you for updating your Mood!";
                                var cardContent = "Your mood is " + moodText;
                                var cardImg = imageChooser(moodVal); 
                                
                                self.emit(':tellWithCard','Thank you for inputing your mood', cardTitle, cardContent, cardImg );
                            })
                        });
                    }
                } else {
                    self.response.speak('It appears that Senior Setup has not been run on this device yet.  Please do so before trying to Input your mood.');
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

function imageChooser(moodVal){
    var obj = {
        smallImageUrl: '',
        largeImageUrl: ''
    }

    if (moodVal == 'Happy'){
        obj.smallImageUrl = cardMoods.happy;
        obj.largeImageUrl = cardMoods.happy;
        return obj
    } else if (moodVal == 'Neutral') {
        obj.smallImageUrl = cardMoods.neutral;
        obj.largeImageUrl = cardMoods.neutral;
        return obj
    } else {
        obj.smallImageUrl = cardMoods.sad;
        obj.largeImageUrl = cardMoods.sad;
        return obj    
    }
}

module.exports = moodHandlers;