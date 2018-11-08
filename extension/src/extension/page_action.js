function initialize() {
    console.log('2UP: Showing app');
    // showMainPage();
}

window.addEventListener("load", initialize);

angular.module('up-app', [
    'ngMaterial',
])
    .config(function($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .warnPalette('green')
            .accentPalette('indigo');
    })
    .service('upPageConfig', function($q) {
        var conf = {
            active: true,
            interval: 1000,
            autoReload: false,
            pageName: 'test'
        }

        this.write = config => {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, tabs => {
                const tabId = tabs[0].id;
                conf.active = config.active;
                chrome.tabs.sendMessage(tabId, {
                    config: {
                        active: config.active,
                        autoReload: config.autoReload,
                        intervalFrom: config.intervalFrom,
                        intervalTo: config.intervalTo,
                    }
                });
                const iconName = conf.active ? 'active' : 'inactive';
                chrome.pageAction.setIcon({
                    path: `images/${iconName}.png`,
                    tabId,
                });
            })
        };

        this.read = () => {
            const defer = $q.defer();
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, tabs => {
                conf.pageName = tabs[0].url;
                chrome.tabs.sendMessage(tabs[0].id, {
                    getConfig: true
                }, config => {
                    conf.pageName = tabs[0].url;
                    conf.active = config.active;
                    conf.interval = config.pollInterval;
                    conf.autoReload = config.autoReload;
                    conf.intervalFrom = config.intervalFrom;
                    conf.intervalTo = config.intervalTo;
                    defer.resolve(conf);
                });
            })
            return defer.promise;
        };
    })
    .component('upAppConfig', {
        template: `
<div class="up-app-config__body">
    <h3 class="up-app-config__header" ng-class="$ctrl.getHeaderClass()"></h3>
    <md-checkbox class="up-app-config__checkbox" ng-model="$ctrl.active" ng-change="$ctrl.update()">Poll data</md-checkbox>
    <md-checkbox class="up-app-config__checkbox" ng-model="$ctrl.autoReload" ng-change="$ctrl.update()">Reload page every</md-checkbox>
    <div>
        <md-input-container class="up-app-config__input">
            <input type="number" max-size="3" min="0" ng-change="$ctrl.update()" ng-disabled="!$ctrl.autoReload" ng-model="$ctrl.intervalFrom">
        </md-input-container>
        <span> to </span>
        <md-input-container class="up-app-config__input">
            <input type="number" max-size="3" min="0" ng-change="$ctrl.update()" ng-disabled="!$ctrl.autoReload" ng-model="$ctrl.intervalTo">
        </md-input-container>
        <span>min</span>
    </div>
</div>`,
        controller: function(upPageConfig) {
            this.$onInit = () => {
                const conf = upPageConfig.read().then(conf => {
                    this.title = conf.pageName;
                    this.active = conf.active;
                    this.autoReload = conf.autoReload;
                    this.intervalFrom = conf.intervalFrom;
                    this.intervalTo = conf.intervalTo;
                });
            };

            this.update = () => {
                upPageConfig.write({
                    active: this.active,
                    autoReload: this.autoReload,
                    intervalFrom: this.intervalFrom,
                    intervalTo: this.intervalTo,
                });
            };

            this.getHeaderClass = () => ({
                'sm': /smarkets/ig.test(this.title),
                'b365': /bet365/ig.test(this.title),
            });

        }
    });