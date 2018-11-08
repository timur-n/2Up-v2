var counter = 0;
var polling = true;
var pollInterval = 2000; // 2s
var poller;
var autoRefresh;
let config = false;
let autoReloadTimer = false;
let lastReload = new Date();

// todo: add calculator to offline page

function needRefresh() {
    return polling && config && config.autoReload;
}

function readData() {
    counter += 1;
    var data = {};
    try {
        if (!window.bb_getScraperName) {
            data.error = '2UP: Scraper not found';
        } else {
            var scraperName = window.bb_getScraperName;
            data = window[scraperName](data, config);
            config = config || (data && data.defaultConfig);
            if (needRefresh() && !autoReloadTimer) {
                const reloadFunc = data.autoReloadFunc ? data.autoReloadFunc : () => window.location.reload();
                const delta = config.intervalTo - config.intervalFrom;
                const timespan = Math.round((config.intervalFrom + delta * Math.random()) * 60000);
                console.log('2UP: auto-refreshing in', timespan);
                autoReloadTimer = setTimeout(() => {
                    if (needRefresh()) {
                        console.log('2UP: auto-refreshing now');
                        lastReload = new Date();
                        autoReloadTimer = false;
                        setTimeout(() => reloadFunc(), 10);
                    }
                }, timespan);
            }
            data.lastReload = lastReload.toISOString();
        }
    } catch (e) {
        data = {
            error: e.message,
            debug: data
        };
    }
    console.log('2UP: ReadData: ', counter, data);
    chrome.runtime.sendMessage({
        data: data
    });
}

function updatePolling() {
    if (poller) {
        clearInterval(poller);
    }
    if (polling) {
        poller = setInterval(readData, pollInterval);
        console.log('2UP: Polling started');
    } else {
        poller = false;
        console.log('2UP: Polling stopped');
    }
}

var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);

        // This part of the script triggers when page is done loading
        console.log("2UP: Document loaded, starting polling");
        chrome.runtime.sendMessage({
            polling: polling
        });
        updatePolling();
    }
}, 100);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('2UP: Message received', request);
    if (request.config) {
        polling = request.config.active;
        pollInterval = request.config.pollInterval || pollInterval;
        config = {
            intervalFrom: request.config.intervalFrom,
            intervalTo: request.config.intervalTo,
            autoReload: request.config.autoReload,
        }
        updatePolling();
    }
    if (request.getConfig) {
        sendResponse({
            active: polling,
            pollInterval,
            autoReload: config.autoReload,
            intervalFrom: config.intervalFrom,
            intervalTo: config.intervalTo,
        });
    }
});