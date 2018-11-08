const express = require('express')
const app = express()
const sse = require('./server-sent-events')
const dataProcessor = require('./data-processor')
const https = require('https')
const fs = require('fs')
const webPush = require('web-push')

let currentData = {}
const port = 3000
const httpsPort = 443
const config = {
    minOdds: 2,
    commission: 0,
}
// Current status of data
const pollStatus = {
    back: true,
    lay: true,
}
// Push notification server keys
const vapid = {
    public: 'BIKFXZoHLosJ9ewQXixG3n8qjTI3HSORBVT2ZUpLAVSLG8c8o22UeRiEpA1L8ZYYRQqkHNTwrdMHqBe2U7Z4_yA',
    private: 'pYw1kJHIVR7j6LSaoh4ml0eUktxHikvgHEBzT8A5Caw',
}
const timeouts = {
    back: undefined,
    lay: undefined,
}
// SSE connections
const connections = []
// PUSH subscribers
const subscribers = {}
// Current offers to send to new subscribers
let currentOffers = {}

const customMatchesFile = 'server/manualMatch.json'

webPush.setVapidDetails('mailto:test@example.com', vapid.public, vapid.private);

app.use(express.json())

app.use(express.static('server/client-app'))

app.use('/test', express.static('test'))

app.use(sse)

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

function sendSse(data) {
    console.log('SSE: sending updates to all subscribers')
    for (let i = 0; i < connections.length; i += 1) {
        connections[i].sseSend(data)
    }
}

function sendPush(payload) {
    for (key in subscribers) {
        console.log('PUSH: Sending web-push', subscribers[key].endpoint);
        webPush.sendNotification(subscribers[key], JSON.stringify(payload))
            // todo: remove then()?
            .then(result => {
                // console.log('web-push sent notification', result.statusCode);
            })
            .catch(error => {
                console.log('PUSH: web-push error', error)
            })
    }
}

// todo: convert to saveConfig/loadConfig (save e.g. min odds)
function sendUpdatedData(data, offers) {
    currentData = data
    if (currentData.updated) {
        console.log('Data updated, total offers', offers.length)
        sendSse(currentData)

        const sentOffers = Object.assign({}, currentOffers)
        // todo-timur: current offers are cleared on data update and existing offers are lost
        currentOffers = {}
        offers.forEach(offer => {
            if (!sentOffers[offer.id]) {
                console.log('OFFER: new', offer.id)
                sendPush(offer)
            }
            currentOffers[offer.id] = offer
        })
    }
    currentData.updated = false
}

function saveCustomMatches() {
    const data = dataProcessor.getManualMatch()
    fs.writeFile(customMatchesFile, JSON.stringify(data), 'utf8', error => {
        if (error) {
            console.log('Failed saving manual match', error)
        }
    })
}

function loadCustomMatches() {
    fs.readFile(customMatchesFile, 'utf8', (error, data) => {
        if (error) {
            console.log('Failed loading manual match', error)
        } else {
            const matches = JSON.parse(data)
            const matchesArray = []
            for (key in matches) {
                matchesArray.push({
                    back: {
                        event: {
                            id: matches[key]
                        }
                    },
                    lay: {
                        event: {
                            id: key
                        }
                    }
                })
            }
            dataProcessor.addMatches(matchesArray)
        }
    })
}

// Process new page data, match back/lay and extract offers
app.get('/data', (req, res) => res.json(currentData))
app.post('/data', (req, res) => {
    const obj = req.body
    const {
        data,
        offers
    } = dataProcessor(obj, config)

    sendUpdatedData(data, offers)

    res.json({})
})

// Management console, maybe use config?
app.post('/manage', (req, res) => {
    const obj = req.body
    console.log('MANAGE', obj);
    // Send push notifications
    if (obj.type === 'offer') {
        sendPush(obj, res)
    }
    if (obj.type === 'command') {
        switch (obj.command) {
            case 'clear':
                currentData = dataProcessor.clear()
                sendSse(currentData)
                break

            case 'match':
                const {
                    data,
                    offers
                } = dataProcessor.addMatches(obj.matches)
                sendUpdatedData(data, offers)
                saveCustomMatches()
                break
        }
        res.json({})
    }
})

app.get('/unmatched', (req, res) => res.json(dataProcessor.getUnmatched()))

app.get('/manual-match', (req, res) => res.json(dataProcessor.getManualMatch()))

// Update config?
app.post('/config', (req, res) => {
    console.log('CONFIG: new config', req.body);
    const newConfig = req.body
    config.commission = newConfig.commission >= 0 ? newConfig.commission : config.commission
    config.minOdds = newConfig.minOdds || config.minOdds
})

// Handle SSE subscriptions
app.get('/stream', (req, res) => {
    console.log('SSE: Connected stream')
    res.sseSetup()
    res.sseSend(currentData)
    connections.push(res)
})

// Handle PUSH subscriptions
// todo: store in DB?
app.post('/subscription', (req, res) => {
    if (req.body.subscription) {
        const subs = req.body.subscription
        if (subscribers[subs.endpoint]) {
            console.log('PUSH: Same subscription, skipping', subs.endpoint)
        } else {
            subscribers[subs.endpoint] = subs
            console.log('PUSH: Subscribed', subs.endpoint)
        }
        for (key in currentOffers) {
            const offer = currentOffers[key]
            console.log('PUSH: offer for new subscriber', key)
            webPush.sendNotification(subs, JSON.stringify(offer))
        }
        res.json({})
    } else {
        console.log('PUSH: Bad post request', req.body)
        res.status(405)
    }
})
// PUSH delete doesn't seem to happen
app.delete('/subscription', (req, res) => {
    if (req.body.subscription) {
        const subs = req.body.subscription
        console.log('PUSH: deleting sub', subs.endpoint)
        delete subscribers[subs.endpoint]
        res.status(201)
    } else {
        console.log('PUSH: Bad delete request', req.body)
        res.status(405)
    }
})


loadCustomMatches()

// Start http and https servers
app.listen(port, () => console.log(`2up server listening on port ${port}`))
const httpsOptions = {
    key: fs.readFileSync('server/2up.key.pem'),
    cert: fs.readFileSync('server/2up.cert.pem'),
}
https.createServer(httpsOptions, app)
    .listen(httpsPort, () => console.log(`2up HTTPS server listening on port ${httpsPort}`))