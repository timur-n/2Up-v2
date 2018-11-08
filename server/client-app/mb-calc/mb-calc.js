angular
    .module("mb-calc", [
        "ngMaterial",
    ])
    .service("mbClipboard", function() {
        this.copy = text => {
            const {
                clipboard
            } = require('electron');
            clipboard.writeText(text + '');
        };
    })
    .service("mbCalculation", function() {
        const calc = new Calc();

        this.fix = calc.fix;
        this.calcQualifier = calc.calcQualifier;
        this.calcFreebet = calc.calcFreebet;
    })
    .component("mbCalc", {
        bindings: {
            options: "<"
        },
        templateUrl: './mb-calc/mb-calc.html',
        controller: function($mdToast, mbClipboard, mbCalculation) {

            this.$onInit = () => {
                this.backOdds = 2.0;
                this.layOdds = 3.0;
                this.commission = 2;
                this.isFreebet = false;
                this.stake = 5;
                this.commissions = [0, 2, 5];
                this.stakes = [5, 10, 20, 25, 50, 100];
                this.steps = [0.01, 0.05, 0.1, 0.5, 1];
                this.tabs = [];
                this.selectedTab = 0;
                this.rows = 10;

                this.backOdds = this.options.backOdds * 1.0 || this.backOdds;
                this.layOdds = this.options.layOdds * 1.0 || this.layOdds;
                this.commission = typeof this.options.commission === 'undefined' ? this.commission : this.options.commission;
                this.stake = this.options.stake || this.stake;
                this.stakes = this.options.stakes || this.stakes;
                this.rows = this.options.rows || this.rows;
                this.mobile = this.options.mobile;

                this.addTab({
                    backOdds: this.backOdds,
                    layOdds: this.layOdds,
                    commission: this.commission,
                    stake: this.stake,
                    isFreebet: false,
                });
            };

            const calc = (backOdds, layOdds, backStake, comm, isFreebet) => {
                if (isFreebet) {
                    return mbCalculation.calcFreebet(backOdds, layOdds, backStake, comm);
                } else {
                    return mbCalculation.calcQualifier(backOdds, layOdds, backStake, comm);
                }
            };

            const getStep = odds => {
                if (odds < 2) {
                    return 0.01;
                } else if (odds >= 2 && odds < 3) {
                    return 0.02;
                } else if (odds >= 3 && odds < 4) {
                    return 0.05;
                } else if (odds >= 4 && odds < 6) {
                    return 0.1;
                } else if (odds >= 6 && odds < 10) {
                    return 0.2;
                } else if (odds >= 10 && odds < 20) {
                    return 0.5;
                } else if (odds >= 20 && odds < 30) {
                    return 1;
                } else if (odds >= 30 && odds < 80) {
                    return 2;
                } else {
                    return 5;
                }
            };

            const getOdds = (start, dir, count) => {
                let done = 0;
                let step = 0.01;
                let current = start;
                let result = [];
                do {
                    step = getStep(current + dir * step);
                    current += dir * step;
                    result.push(mbCalculation.fix(current));
                    done += 1;
                }
                while (done < count);
                return result;
            };

            this.getOddsTable = (odds, rowCount) => {
                let result = [odds];
                result = result
                    .concat(getOdds(odds, -1, rowCount / 2))
                    .concat(getOdds(odds, 1, rowCount / 2))
                    .sort((a, b) => a - b);
                return result;
            };

            const swap = (source, dest) => {
                dest.backOdds = source.backOdds;
                dest.layOdds = source.layOdds;
                dest.commission = source.commission;
                dest.stake = source.stake;
                dest.isFreebet = source.isFreebet;
            }

            this.addTab = (options) => {
                const defaultTab = {
                    backOdds: 2,
                    layOdds: 3,
                    commission: 2,
                    stake: 5,
                    isFreebet: false,
                };
                this.tabs.push(options || defaultTab);
                this.selectTab(this.tabs[this.tabs.length - 1]);
            };

            this.removeTab = (tab, event) => {
                if (!event || (event && event.which === 3)) {
                    const i = this.tabs.indexOf(tab);
                    if (i >= 0 && this.tabs.length > 1) {
                        this.selectedTab = this.selectedTab ? this.selectedTab - 1 : 0;
                        this.tabs.splice(i, 1);
                    }
                }
            };

            this.getTabLabel = tab => `${tab.stake}@${tab.backOdds}`;

            this.selectTab = tab => {
                swap(tab, this);
                this.recalculate();
            };

            this.recalculate = () => {
                this.results = [];
                const oddsTable = this.getOddsTable(this.layOdds, this.rows);
                for (let i = 0; i < oddsTable.length; i += 1) {
                    const result = calc(this.backOdds, oddsTable[i], this.stake, this.commission, this.isFreebet);
                    result.isCurrent = result.layOdds === this.layOdds;
                    if (result.isCurrent) {
                        this.layStake = result.layStake;
                    }
                    this.results.push(result);
                }
                // todo: change input step
                const tab = this.tabs[this.selectedTab];
                swap(this, tab);
            };

            this.updateCommission = commission => {
                this.commission = commission;
                this.recalculate();
            };

            this.updateStake = stake => {
                this.stake = stake;
                this.recalculate();
            }

            this.setFreebet = isFreebet => {
                this.isFreebet = isFreebet;
                this.recalculate();
            }

            this.select = result => {
                if (!this.mobile) {
                    mbClipboard.copy(result.layStake);
                }
                this.layOdds = result.layOdds;
                this.recalculate();
                $mdToast.showSimple(`Copied ${result.layStake}`);
            };

            this.copyDetails = () => {
                const line = `${this.stake}\t${this.backOdds}\t${this.layOdds}\t${this.layStake}\t${this.commission}`;
                mbClipboard.copy(line);
                $mdToast.showSimple('Current details copied');
            };
        }
    });