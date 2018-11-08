if (!window.__karma__) {
    if (window.bb_getScraperName) {
        throw new Error('bb_getSmarketsListData already registered (Smarkets list)');
    }
    window.bb_getScraperName = 'bb_getSmarketsListData';
}

window.bb_getSmarketsListData = function(result) {
    var events = document.querySelectorAll('.event-list-container .event-list.list-view li.item-tile.upcoming');
    result.events = [];
    result.source = 'smarkets-list';
    var eventName = /(.*) vs. (.*)/i;

    events.forEach(event => {
        var eventData = {
            home: {},
            away: {},
        };
        var prices = event.querySelectorAll('.contract-item .bid .price.sell .formatted-price');
        var name = (event.querySelector('a.title') || {}).textContent;
        eventData.time = (event.querySelector('.date-and-info time') || {}).getAttribute('datetime');
        eventData.home.name = name.replace(eventName, '$1');
        eventData.away.name = name.replace(eventName, '$2');
        eventData.home.layOdds = (prices[0] || {}).textContent * 1.0;
        eventData.away.layOdds = (prices[2] || {}).textContent * 1.0;
        result.events.push(eventData);
    });

    result.defaultConfig = {
        autoReload: true,
        intervalFrom: 2,
        intervalTo: 2,
    };

    return result;
};