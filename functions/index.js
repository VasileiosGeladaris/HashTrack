const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const geo = require('./geocode.js');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const app = express();


// Setting server/firebase attributes.
const PORT = 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

app.set('port', PORT);
app.set('env', NODE_ENV);
app.set('view engine', 'pug')


// Send index file.
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
})


// Handling map requests for the client.
app.get('/api/v1/track/:id/c', (req, res) => {
    res.render('cmap', {eventid: req.params.id});
})


// Handling map requests for the driver.
app.get('/api/v1/track/:id/d', (req, res) => {
    res.render('dmap', {eventid: req.params.id});
})


// Handle GET Requests.
app.get('/api/v1/create/:dest', async (req, res, next) => {
    try {
        const dest = req.params.dest;

        // Request is valid, generate an ID and create a record for the database.
        const id = makeId(8);
        const docRef = db.collection('Events').doc(id);
        let xhttp = new XMLHttpRequest();

        // Send request get the client's address' coordinates.
        xhttp.onreadystatechange = async function() {

            if (this.readyState === 4 && this.status === 200) {
                let response = JSON.parse(this.responseText);

                let lat = response.results[0].geometry.location.lat;
                let lng = response.results[0].geometry.location.lng;

                // Create record in the DB.
                await docRef.set({
                    destination: new admin.firestore.GeoPoint(lat, lng),
                    driver: new admin.firestore.GeoPoint(0, 0),
                    completed: false,
                    active: false,
                    alerting: false
                });

                const link = 'https://us-central1-hashtrackapi.cloudfunctions.net/app/api/v1/track/' + id

                var json = {};
                json.id = id;
                json.clientUrl = link + '/c';
                json.driverUrl = link + '/d';
                res.json(json);

                return;
            }
        }

        xhttp.open("GET", geo.getURL(dest), true);
        xhttp.send();
        return;

    } catch (e) {
        next(e);
        return;
    }
})


// Generate a random ID for each event.
function makeId(length){

    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;

    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}


// Run the server.
app.listen(PORT, () => {
    console.log(`Express Server started on Port ${app.get('port')} | Environment: ${app.get('env')}`);
});

exports.app = functions.https.onRequest(app);
