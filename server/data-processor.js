const calc = require('./client-app/mb-calc/calc');

let data = {}
let currentOffers = {}
const offerTimestamps = {}
const unmatchedEvents = {}
const manualMatch = {}

// todo: add a map of name/id so that back/lay events could be matched manually
function transformSmarketsName(name) {
    const transforms = {
        'AFC Bournemouth': 'Bournemouth',
        'Brighton & Hove Albion': 'Brighton',
        'Wolverhampton Wanderers': 'Wolverhampton',
        'Tottenham Hotspur': 'Tottenham',
        'Manchester United': 'Man Utd',
        'Manchester City': 'Man City',
        'Man City': 'Man City',
        'Preston North End': 'Preston',
        'Wigan Athletic': 'Wigan',
        'Queens Park Rangers': 'QPR',
        'Bolton Wanderers': 'Bolton',
        'Nottingham Forest': 'Nottm Forest',
        'Blackburn Rovers': 'Blackburn',
        'Sheffield Wednesday': 'Sheff Wed',
        'Sheffield United': 'Sheff Utd',
        'West Bromwich Albion': 'West Brom',
        'Derby County': 'Derby',
        /*
        'Internazionale': 'Inter Milan',
        'Lokomotiv Moskva': 'Lokomotiv Moscow',
        'Atlético Madrid': 'Atletico Madrid',
        'Porto': 'FC Porto',
        'Schalke 04': 'Schalke',
        'Real Valladolid': 'Valladolid',
        'Bayern München': 'Bayern Munich',
        'Hoffenheim': 'TSG Hoffenheim',
        'Olympique Lyonnais': 'Lyon',
        'CSKA Moskva': 'CSKA Moscow',
        'Viktoria Plzeň': 'Viktoria Plzen',
        'Milan': 'AC Milan',
        'Sporting CP': 'Sporting',
        'Olympique Marseille': 'Marseille',
        'Zenit': 'Zenit St Petersburg',
        'Apollon': 'Apollon Limassol',
        'Sarpsborg 08': 'Sarpsborg',
        */
    }
    if (transforms[name]) {
        return transforms[name]
    } else {
        return name
            .replace(/ town/i, '')
            .replace(/ city/i, '')
            .replace(/ united/i, '')
            .replace(/è/ig, 'e')
            .replace(/ş/ig, 's')
            .replace(/ç/ig, 'c')
            .replace(/ň/ig, 'n')
            .replace(/ü/ig, 'u')
            .replace(/ö/ig, 'u')
            .trim()
    }
}

const getEventId = event => `${event.home.name}-${event.away.name}`

function oddsToStake(odds) {
    if (odds < 2) {
        return 500
    } else if (odds < 3) {
        return 300
    } else if (odds <= 5) {
        return 200
    } else {
        return 100
    }
}

function updateEvent(event, oddsName) {
    let updated
    let e = data[event.id]
    if (!e) {
        const backId = manualMatch[event.id]
        e = data[backId]
    }
    if (e) {
        updated = e.home[oddsName] !== event.home[oddsName] ||
            e.away[oddsName] !== event.away[oddsName]
        e.home[oddsName] = event.home[oddsName]
        e.away[oddsName] = event.away[oddsName]
        if (event.time) {
            e.time = event.time
        }
        delete unmatchedEvents[event.id]
    } else {
        unmatchedEvents[event.id] = event
    }
    data.updated = data.updated || updated
}

// todo: fight odds trickle pushing too many notifications
function calculateOffers(data, config) {
    const offers = []
    const calcOffer = (event, obj) => {
        if (obj.backOdds >= config.minOdds) {
            const stake = oddsToStake(obj.backOdds)
            const result = calc.calcQualifier(obj.backOdds, obj.layOdds, stake, config.commission, 10000)
            const id = `${event.source}-${event.home.name}-${event.away.name}-${obj.name}-${obj.backOdds}-${obj.layOdds}`
            const now = new Date()
            const thresholdMsec = config.timeThreshold * 60000
            const isNew = !offerTimestamps[id] || (now.getTime() - offerTimestamps[id].getTime()) > thresholdMsec
            if (obj.layOdds && (result.isProfit || result.isOk) && isNew) {
                offers.push({
                    type: 'offer',
                    id: id,
                    text: `${event.home.name} v ${event.away.name}`,
                    time: event.time,
                    selection: obj.name,
                    back: obj.backOdds,
                    lay: obj.layOdds,
                    stake: stake,
                    layStake: result.layStake,
                    profitLoss: result.profit,
                    rating: result.profit,
                    source: event.source,
                })
                offerTimestamps[id] = now
            }
        }
    }
    for (key in data) {
        const event = data[key]
        if (event && event.home) {
            // console.log('Calculating offers for ', event)
            calcOffer(event, event.home)
            calcOffer(event, event.away)
        }
    }
    return offers;
}

module.exports = function(newData, config) {
    // Match back/lay odds
    (newData.events || []).forEach(event => {
        event.home.name = transformSmarketsName(event.home.name)
        event.away.name = transformSmarketsName(event.away.name)
        event.id = getEventId(event)
        event.source = newData.source
        if (newData.source === 'smarkets-list') {
            updateEvent(event, 'layOdds')
        } else if (newData.source === 'bet365-list') {
            if (data[event.id]) {
                updateEvent(event, 'backOdds')
            } else {
                data[event.id] = event
                data.updated = true
            }
        }
    })

    // Calculate prices and extract offers
    const offers = calculateOffers(data, config)

    return {
        data: data,
        offers: offers,
    }
}

module.exports.clear = function() {
    data = {}
    return data
}

module.exports.addMatches = function(matches) {
    // todo: add support for multiple sources, currently once lay is matched to back, it can't be matched to another back
    (matches || []).forEach(match => {
        const backId = match && match.back && match.back.event && match.back.event.id
        const layId = match && match.lay && match.lay.event && match.lay.event.id
        console.log('Adding custom match', backId, ' => ', layId)
        manualMatch[layId] = backId
        delete unmatchedEvents[layId]
        data.updated = true
    })
    return {
        data,
        offers: []
    }
}

module.exports.getUnmatched = function() {
    return unmatchedEvents
}

module.exports.getManualMatch = function() {
    return manualMatch
}