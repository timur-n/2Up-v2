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
        .post('http://localhost:3000/data', data)
        .then(response => console.log('2UP: Background: http response', response))
        .catch(error => console.log('2UP: Background: post error'));

    sendResponse();
});