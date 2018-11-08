angular
    .module('up', [
        'ngMaterial',
        'up-services',
        'mb-calc',
    ])
    .config(function($mdThemingProvider, $mdIconProvider) {
        $mdThemingProvider.theme('default')
            .warnPalette('green')
            .accentPalette('indigo');
        $mdIconProvider
            .icon('close', 'icons/close.svg')
            .icon('copy', 'icons/copy.svg')
            .icon('error', 'icons/error.svg')
            .icon('settings', 'icons/settings.svg')
            .icon('delete', 'icons/delete.svg');
    })
    .run(function(upPushNotifications) {
        upPushNotifications.init();
    })
    .component('upOffer', {
        bindings: {
            offer: '<',
            onAck: '&',
        },
        template: `
<div layout="row" class="up-offer__box" layout-align="start center">
    <md-input-container class="up-offer__back-stake">
        <label>Back</label>
        <input type="number" size="3" ng-change="$ctrl.recalculate()" ng-model="$ctrl.back">
    </md-input-container>
    <span>Lay {{$ctrl.lay}} @ {{$ctrl.layOdds}} for {{$ctrl.liability}}</span>
    <span flex>{{$ctrl.offer.text}}</span>
    <md-button class="md-icon-button" aria-label="Copy" ng-click="$ctrl.copy()">
        <md-icon md-svg-icon="copy"></md-icon>
    </md-button>
    <md-button class="md-icon-button" aria-label="Close" ng-click="$ctrl.ack()">
        <md-icon md-svg-icon="close"></md-icon>
    </md-button>
</div>`,
        controller: function() {

            this.$onInit = () => {
                this.back = 100; // todo: read from offer settings
                this.recalculate();
            };

            this.recalculate = () => {
                this.lay = this.back; // todo: calculate lay stake and other stuff
            };

            this.ack = () => {
                this.onAck({
                    offer: this.offer
                })
            }
        }
    })
    .component('upApp', {
        template: `
<div layout="row" layout-align="start center" class="up-app__header" ng-class="{'up-app__header--error': $ctrl.errors.length}">
    <span flex class="up-app__header-title">2UP</span>
    <md-menu ng-if="$ctrl.errors.length">
        <md-button ng-click="$mdMenu.open($event)" class="md-icon-button">
            <md-icon md-svg-icon="error"></md-icon>
        </md-button>
        <md-menu-content>
            <md-menu-item ng-repeat="error in $ctrl.errors"><span>{{error}}</span></md-menu-item>
        </md-menu-content>
    </md-menu>
    <md-menu>
        <md-button ng-click="$mdMenu.open($event)" class="md-icon-button">
            <md-icon md-svg-icon="settings"></md-icon>
        </md-button>
        <md-menu-content>
            <md-menu-item><md-checkbox ng-model="$ctrl.logOn">Log</md-checkbox></md-menu-item>
            <md-menu-item><md-button ng-click="$ctrl.settings()">Settings</md-button></md-menu-item>
            <md-menu-item><md-button ng-click="$ctrl.refreshServer()">Refresh</md-button></md-menu-item>
            <md-menu-item><md-button ng-click="$ctrl.match()">Match</md-button></md-menu-item>
        </md-menu-content>
    </md-menu>
</div>
<div>
    <up-offer offer="offer" ng-repeat="offer in $ctrl.offers track by offer.id" on-ack="$ctrl.ackOffer(offer)"></up-offer>
</div>
<table class="up-app__table">
    <thead>
        <tr>
            <th rowspan="2">Event</th>
            <th colspan="2">Home</th>
            <th colspan="2">Away</th>
        </tr>
        <tr>
            <th>Odds</th>
            <th>Info</th>
            <th>Odds</th>
            <th>Info</th>
        </tr>
    </thead>
    <tbody>
        <tr ng-repeat="event in $ctrl.events|filter: $ctrl.isVisible" ng-class="{'up-app__row--selected': $ctrl.isSelected(event)}">
            <td ng-click="$ctrl.toggleSelection(event)">
                <div><span class="up-app__cell-event-name">{{event.home.name}} v {{event.away.name}}</span></div>
                <span>{{event.time|date:'dd/MM HH:mm'}}</span>
            </td>
            <td ng-click="$ctrl.calc(event, true)">
                <span class="up-app__cell-back-odds">{{event.home.backOdds}}</span>
                <span>{{event.home.layOdds}}</span>
            </td>
            <td ng-click="$ctrl.calc(event, true)"
            ng-class="{'up-app--profit': event.home.result.isProfit, 'up-app--ok': event.home.result.isOk}">
                <span>{{event.home.result.profit}}</span>
            </td>
            <td ng-click="$ctrl.calc(event, false)">
                <span class="up-app__cell-back-odds">{{event.away.backOdds}}</span>
                <span>{{event.away.layOdds}}</span>
            </td>
            <td ng-click="$ctrl.calc(event, false)"
            ng-class="{'up-app--profit': event.away.result.isProfit, 'up-app--ok': event.away.result.isOk}">
                <span>{{event.away.result.profit}}</span>
            </td>
        </td>
        </tr>
    </tbody>
</table>
`,
        controller: function($scope,
            $log,
            $http,
            $timeout,
            mbCalculation,
            upCalcDialog,
            upSettingsDialog,
            upPushNotifications,
            upCustomMatches,
            upSse) {

            this.offers = [];
            this.errors = [];

            let errorsData = {};
            const errorsArray = () => {
                this.errors = [];
                for (key in errorsData) {
                    this.errors.push(errorsData[key]);
                }
            }
            const addError = (isError, id, text) => {
                if (isError) {
                    errorsData[id] = text;
                    errorsArray();
                }
            }

            const removeError = id => {
                delete errorsData[id];
                errorsArray();
            };

            this.$onInit = () => {
                this.sseOk = upSse.register(this.updateData);
                addError(!this.sseOk, 'no-sse', 'SSE not supported');
                $timeout(() => {
                    const notificationStatus = upPushNotifications.getStatus();
                    addError(!notificationStatus.serviceWorkerSupported, 'no-sw', 'Service workers not supported');
                    addError(notificationStatus.permissionGranted !== 'granted', 'no-perm', 'Permission not supported');
                    // upPushNotifications.subscribe(this.updateData);
                });
            }

            this.events = [];
            this.status = []
            this.selectedEvents = {};

            this.logOn = false;

            this.offer = data => {
                // this.offers.unshift(data.offer);
                // this.offers = [].concat(this.offers);
                // upPushNotifications.show({
                //     title: data.offer.text
                // });
            };

            this.ackOffer = offer => {
                const i = this.offers.indexOf(offer);
                if (i > -1) {
                    this.offers.splice(i, 1);
                }
            }

            this.config = data => {
                this.events = [].concat(data.added);
            };

            this.error = data => {
                this.errorMessage = data.error;
                addError(true, data.error);
            }

            this.setData = data => {
                const calc = options => options.result = mbCalculation.calcQualifier(
                    options.backOdds, options.layOdds, 100, 0, 10000);

                this.events = []
                for (event in data) {
                    if (typeof data[event] === 'object') {
                        const eventData = data[event];
                        calc(eventData.home);
                        calc(eventData.away);
                        this.events.push(eventData);
                    }
                }
            }

            this.isVisible = event => event && event.home && event.home.layOdds && event.away && event.away.layOdds;

            this.updateData = data => {
                this.logOn && $log.info('2UP: new data', data);
                if (data.type !== 'sse-fail') {
                    removeError('sse-fail');
                }
                switch (data.type) {
                    case 'offer':
                        this.offer(data);
                        break;
                    case 'config':
                        this.config(data);
                        break;
                    case 'error':
                        this.error(data);
                        break;
                    case 'sse-fail':
                        addError(true, 'sse-fail', 'SSE failed')
                        break;
                    default:
                        this.setData(data);
                };
                $scope.$apply();
            };

            this.calc = (event, useHome) => upCalcDialog.show(event, useHome);

            this.settings = () => upSettingsDialog.show();

            this.isSelected = (event) => !!this.selectedEvents[event.id];

            this.toggleSelection = (event) => {
                if (this.selectedEvents[event.id]) {
                    delete this.selectedEvents[event.id];
                } else {
                    this.selectedEvents[event.id] = true;
                }
            };

            this.refreshServer = () => $http.post('/manage', {
                type: 'command',
                command: 'clear',
            });

            this.match = () => {
                const backs = [];
                this.events.forEach(event => {
                    if (!this.isVisible(event)) {
                        backs.push({
                            name: event.id,
                            event,
                        });
                    }
                });
                $http.get('/unmatched')
                    .then(response => {
                        console.log('Got matches', response);
                        const lays = [];
                        for (key in response.data) {
                            lays.push({
                                name: key,
                                event: response.data[key],
                            });
                        }
                        return upCustomMatches.show(backs, lays);
                    })
                    .then(result => {
                        console.log('Matches', result);
                        if (result) {
                            $http.post('/manage', {
                                type: 'command',
                                command: 'match',
                                matches: result,
                            });
                        }
                    })
                    .catch(error => alert(error.message || error.error || error));
            }
        }
    });