angular
    .module('up-services', [
        'ngMaterial'
    ])
    .service('upSse', function() {
        this.register = callback => {
            const sseOk = typeof(EventSource) !== 'undefined'
            if (sseOk) {
                const sse = new EventSource('/stream');
                sse.onerror = () => {
                    callback({
                        type: 'sse-fail'
                    });
                }
                sse.onmessage = event => {
                    const eventData = JSON.parse(event.data);
                    callback(eventData);
                }
            }
            return sseOk;
        }
    })
    .service('upPushNotifications', function() {
        const serverKey = 'BIKFXZoHLosJ9ewQXixG3n8qjTI3HSORBVT2ZUpLAVSLG8c8o22UeRiEpA1L8ZYYRQqkHNTwrdMHqBe2U7Z4_yA';
        let serviceWorkerSupported = false;
        let swRegistration;
        let permissionGranted = 'Uninitialized';

        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/\-/g, '+')
                .replace(/_/g, '/');
            const rawData = window.atob(base64);
            return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
        }

        function sendSubscriptionToBackEnd(subscription) {
            console.log('Sending subs to backend...');
            return fetch('/subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subscription
                    })
                })
                .then(response => {
                    console.log('Sent subscription to backend', response);
                    if (!response.ok) {
                        throw new Error('Bad status code from server', response);
                    }
                    return response.json();
                })
                .then(responseData => console.log('Subscription response', responseData));
        }

        this.init = () => {
            serviceWorkerSupported = 'serviceWorker' in navigator;

            if (serviceWorkerSupported) {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('Service worker successfully registered.');
                        swRegistration = registration;
                        const subscribeOptions = {
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(serverKey)
                        };
                        return registration.pushManager.subscribe(subscribeOptions);
                    })
                    .then(pushSubscription => {
                        console.log('Received subscription', pushSubscription);
                        return sendSubscriptionToBackEnd(pushSubscription);
                    })
                    .catch(error => {
                        console.error('Error registering service worker or subscribing', error);
                    });
            }

            Notification.requestPermission(result => {
                console.log('Notification permission', result);
                permissionGranted = result;
            });
        };

        this.show = options => {
            if (swRegistration) {
                swRegistration.showNotification(options.title, options);
            }
        };

        this.getStatus = () => ({
            permissionGranted,
            serviceWorkerSupported,
        });
    })
    .service('upCalcDialog', function($mdDialog) {
        this.show = (event, useHome) => {
            return $mdDialog.show({
                template: `
<md-dialog class="up-calc">
<md-toolbar>
    <div class="md-toolbar-tools">
        <h2 flex>Calculator</h2>
        <md-button class="md-icon-button" ng-click="$ctrl.close()" aria-label="Close">
            <md-icon md-svg-icon="close"></md-icon>
        </md-button>
    </div>
</md-toolbar>
<md-dialog-content>
    <div class="up-calc__content">
        <div class="up-calc__title" ng-if="$ctrl.home && $ctrl.away">
            <span ng-class="{'up-calc--selected': $ctrl.useHome}">{{$ctrl.home}}</span>
            <span>&nbsp;v&nbsp;</span>
            <span ng-class="{'up-calc--selected': !$ctrl.useHome}">{{$ctrl.away}}</span></div>
        <mb-calc options="$ctrl.data"></mb-calc>
    </div>
</md-dialog-content>
<md-dialog-actions>
    <md-button ng-click="$ctrl.close()">Close</md-button>
</md-dialog-actions>
</md-dialog>`,
                controllerAs: '$ctrl',
                controller: function($mdDialog) {
                    this.home = event.home && event.home.name;
                    this.away = event.away && event.away.name;
                    this.useHome = useHome;
                    const selection = event[useHome ? 'home' : 'away'];
                    this.data = {
                        commission: 0,
                        stake: selection.stake || 100,
                        stakes: [10, 25, 50, 100, 200, 300],
                        backOdds: selection.backOdds,
                        layOdds: selection.layOdds,
                        rows: 4,
                        mobile: true,
                    };

                    this.close = () => $mdDialog.hide();
                }
            });
        }
    })
    .service('upSettingsDialog', function($mdDialog) {
        this.show = (event, useHome) => {
            return $mdDialog.show({
                template: `
<md-dialog class="up-settings">
<md-toolbar>
    <div class="md-toolbar-tools">
        <h2 flex>Settings</h2>
        <md-button class="md-icon-button" ng-click="$ctrl.cancel()" aria-label="Close">
            <md-icon md-svg-icon="close"></md-icon>
        </md-button>
    </div>
</md-toolbar>
<md-dialog-content>
    <div>
        <md-input-container class="md-block">
            <label>Min odds</label>
            <input type="number" ng-model="$ctrl.minOdds">
        </md-input-container>
    </div>
</md-dialog-content>
<md-dialog-actions>
    <md-button ng-click="$ctrl.cancel()">Cancel</md-button>
    <md-button class="md-raised md-primary" ng-click="$ctrl.ok()">OK</md-button>
</md-dialog-actions>
</md-dialog>`,
                controllerAs: '$ctrl',
                controller: function($mdDialog, $http) {

                    this.minOdds = 2;
                    this.commission = 0;

                    // $http.get().then()

                    this.cancel = () => $mdDialog.hide();

                    this.ok = () => $mdDialog.hide();
                }
            });
        }
    })
    .service('upCustomMatches', function($mdDialog) {
        this.show = (back, lay) => {
            return $mdDialog.show({
                template: `
<md-dialog class="up-matches">
<md-toolbar>
    <div class="md-toolbar-tools">
        <h2 flex>Manual match</h2>
        <md-button class="md-icon-button" ng-click="$ctrl.cancel()" aria-label="Close">
            <md-icon md-svg-icon="close"></md-icon>
        </md-button>
    </div>
</md-toolbar>
<md-dialog-content>
    <h3>Unmatched</h3>
    <div layout="row">
        <div flex="50">
            <md-list>
                <md-list-item ng-repeat="item in $ctrl.backItems" ng-click="$ctrl.addBack(item)"
                ng-class="[item === $ctrl.current.back && 'up-match--selected', 'up-match__item']"
                >{{item.name}}</md-list-item>
            </md-list>
        </div>
        <div>
            <md-list>
                <md-list-item ng-repeat="item in $ctrl.layItems" ng-click="$ctrl.addLay(item)"
                ng-class="[item === $ctrl.current.lay && 'up-match--selected', 'up-match__item']"
                >{{item.name}}</md-list-item>
            </md-list>
        </div>
    </div>
    <h3>Matched</h3>
    <md-list>
        <md-list-item ng-repeat="item in $ctrl.matches" ng-click="$ctrl.unmatch(item)">{{item.back.name}} => {{item.lay.name}}</md-list-item>
    </md-list>
</md-dialog-content>
<md-dialog-actions>
    <md-button ng-click="$ctrl.cancel()">Cancel</md-button>
    <md-button class="md-raised md-primary" ng-click="$ctrl.ok()">OK</md-button>
</md-dialog-actions>
</md-dialog>`,
                controllerAs: '$ctrl',
                controller: function($mdDialog) {

                    this.backItems = back;
                    this.layItems = lay;
                    this.matches = [];
                    this.current = {};

                    console.log('Dialog', back, lay);

                    const add = () => {
                        if (this.current.back && this.current.lay) {
                            let i = this.backItems.indexOf(this.current.back);
                            this.backItems.splice(i, 1);
                            i = this.layItems.indexOf(this.current.lay);
                            this.layItems.splice(i, 1);
                            this.matches.push(this.current);
                            this.current = {};
                        }
                    }

                    this.addBack = item => {
                        this.current.back = item;
                        add();
                    };

                    this.addLay = item => {
                        this.current.lay = item;
                        add();
                    };

                    this.cancel = () => $mdDialog.hide();

                    this.ok = () => $mdDialog.hide(this.matches);
                }
            });
        }
    });