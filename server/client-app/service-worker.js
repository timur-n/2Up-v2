const examplePage = '/demos/notification-examples/example-page.html';

function openWindow(event) {
    const examplePage = '/demos/notification-examples/example-page.html';
    const promiseChain = clients.openWindow(examplePage);
    event.waitUntil(promiseChain);
}

function focusWindow(event) {
    const urlToOpen = new URL(examplePage, self.location.origin).href;
    const promiseChain = clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((windowClients) => {
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        });

    event.waitUntil(promiseChain);
}

function dataNotification(event) {
    const notificationData = event.notification.data;
    console.log('');
    console.log('The data notification had the following parameters:');
    Object.keys(notificationData).forEach((key) => {
        console.log(`  ${key}: ${notificationData[key]}`);
    });
    console.log('');
}

function isClientFocused() {
    return clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((windowClients) => {
            let clientIsFocused = false;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.focused) {
                    clientIsFocused = true;
                    break;
                }
            }

            return clientIsFocused;
        });
}

function demoMustShowNotificationCheck(event) {
    const promiseChain = isClientFocused()
        .then((clientIsFocused) => {
            if (clientIsFocused) {
                console.log('Don\'t need to show a notification.');
                return;

            }

            // Client isn't focused, we need to show a notification.
            return self.registration.showNotification('Had to show a notification.');
        });

    event.waitUntil(promiseChain);
}

function demoSendMessageToPage(event) {
    const promiseChain = isClientFocused()
        .then((clientIsFocused) => {
            if (clientIsFocused) {
                windowClients.forEach((windowClient) => {
                    windowClient.postMessage({
                        message: 'Received a push message.',
                        time: new Date().toString()
                    });
                });
            } else {
                return self.registration.showNotification('No focused windows', {
                    body: 'Had to show a notification instead of messaging each page.'
                });
            }
        });

    event.waitUntil(promiseChain);
}

function tryShow(data) {
    console.log('tryShow()', data);
    const offer = (data.type === 'offer') && data;
    const time = new Date(offer && offer.time);
    const timeStr = time.toLocaleTimeString('en-GB').slice(0, 5);
    const title = (offer && `${offer.text} - ${timeStr}`) || JSON.stringify(data);
    const options = offer && {
        body: `${offer.profitLoss}: ${offer.stake}/${offer.layStake} @ ${offer.back}/${offer.lay}`,
        tag: offer.id,
        renotify: true,
        image: 'client-app/icons/settings.svg'
    };
    self.registration.showNotification(title, options);
}

self.addEventListener('push', function(event) {
    if (event.data) {
        switch (event.data.text()) {
            case 'must-show-notification':
                demoMustShowNotificationCheck(event);
                break;
            case 'send-message-to-page':
                demoSendMessageToPage(event);
                break;
            default:
                console.warn('Unsure of how to handle push event: ', event.data.text());
                tryShow(JSON.parse(event.data.text()));
                // todo-timur: send message to the page, or show notification?
                break;
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    if (!event.action) {
        // Was a normal notification click
        console.log('Notification Click.');
        return;
    }

    switch (event.action) {
        case 'coffee-action':
            console.log('User ❤️️\'s coffee.');
            break;
        case 'doughnut-action':
            console.log('User ❤️️\'s doughnuts.');
            break;
        case 'gramophone-action':
            console.log('User ❤️️\'s music.');
            break;
        case 'atom-action':
            console.log('User ❤️️\'s science.');
            break;
        default:
            console.log(`Unknown action clicked: '${event.action}'`);
            break;
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    switch (event.notification.tag) {
        case 'open-window':
            openWindow(event);
            break;
        case 'focus-window':
            focusWindow(event);
            break;
        case 'data-notification':
            dataNotification(event);
            break;
        default:
            // NOOP
            break;
    }
});

const notificationCloseAnalytics = () => {
    return Promise.resolve();
};

self.addEventListener('notificationclose', function(event) {
    const dismissedNotification = event.notification;

    const promiseChain = notificationCloseAnalytics();
    event.waitUntil(promiseChain);
});

self.addEventListener('message', function(event) {
    console.log('Received message from page.', event.data);
    switch (event.data) {
        case 'must-show-notification-demo':
            self.dispatchEvent(new PushEvent('push', {
                data: 'must-show-notification'
            }));
            break;
        case 'send-message-to-page-demo':
            self.dispatchEvent(new PushEvent('push', {
                data: 'send-message-to-page'
            }));
            break;
        default:
            console.warn('Unknown message received in service-worker.js');
            break;
    }
});