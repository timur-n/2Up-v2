if (!window.__karma__) {
    if (window.bb_getScraperName) {
        throw new Error('bb_getB365ListData already registered (bet365 list)');
    }
    window.bb_getScraperName = 'bb_getB365ListData';
}

window.bb_getB365ListData = function(result) {
    var containers = document.querySelectorAll('.gl-MarketGroup.cm-CouponMarketGroup');
    result.events = [];
    result.source = 'bet365-list';
    var eventName = /(.*) v (.*)/i;

    containers.forEach(container => {
        var events = container.querySelectorAll('.sl-CouponParticipantWithBookCloses .sl-CouponParticipantWithBookCloses_NameContainer');
        var markets = container.querySelectorAll('.sl-MarketCouponValuesExplicit33.gl-Market_General');
        if (markets.length > 2) {
            var homes = markets[0].querySelectorAll('.gl-ParticipantOddsOnly_Odds');
            var aways = markets[2].querySelectorAll('.gl-ParticipantOddsOnly_Odds');
            if (!(events.length === homes.length && events.length === aways.length)) {
                throw new Error(`Column lenghts do not match: events: ${events.length}, homes: ${homes.length}, aways: ${aways.length}`);
            }
            events.forEach((event, index) => {
                var live = event.querySelectorAll('.pi-ScoreVariantCentred').length;
                if (!live) {
                    var eventData = {
                        home: {},
                        away: {},
                        live: live
                    };
                    var name = event.textContent;
                    eventData.home.name = name.replace(eventName, '$1');
                    eventData.away.name = name.replace(eventName, '$2');
                    eventData.home.backOdds = homes[index].textContent * 1.0;
                    eventData.away.backOdds = aways[index].textContent * 1.0;
                    result.events.push(eventData);
                }
            });
        }
    });

    result.defaultConfig = {
        autoReload: true,
        intervalFrom: 5,
        intervalTo: 10,
    };
    result.autoReloadFunc = () => {
        var event = new MouseEvent('click', {
            view: window,
            bubbles: true
        });
        document.querySelector('.wl-IconBlock_Icon.wl-IconBlock_IconRefresh').dispatchEvent(event);
    };

    return result;
};