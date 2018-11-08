let serverUrl = 'http://localhost:3000'

// using a message handler from the inject scripts
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    chrome.pageAction.show(sender.tab.id);
    const data = Object.assign({
        id: sender.tab.id,
        url: sender.tab.url
    }, request && request.data || {
        error: 'No data'
    });
    console.log('2UP: Background: message received', request, data);
    axios
        .post(serverUrl + '/data', data)
        .then(response => console.log('2UP: Background: http response', serverUrl, response))
        .catch(error => console.log('2UP: Background: post error', serverUrl, error));

    sendResponse();
});

function getConfig() {
    return {
        serverUrl
    }
}

function setConfig(config) {
    serverUrl = config.serverUrl;
}