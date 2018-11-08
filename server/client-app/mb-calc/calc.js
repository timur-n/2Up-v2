(function() {
    function Calc() {
        const fix = number => Math.round(number * 100) / 100;

        this.fix = fix;

        this.calcQualifier = (backOdds, layOdds, backStake, layCommission, size) => {
            const layCommissionPc = layCommission / 100
            const backReturn = backOdds * backStake;
            const result = {
                backStake: backStake,
                profit: NaN,
                isProfit: false,
                layOdds: layOdds,
                valid: true
            };

            // Lay stake, convert to fixed immediately to match betfair's numbers
            result.layStake = backReturn / (layOdds - layCommissionPc);
            result.layStake = result.layStake.toFixed(2) * 1.0;
            result.layProfit = result.layStake * (1 - layCommissionPc);

            // Lay risk (liability)
            result.liability = result.layStake * (layOdds - 1);
            result.liability = result.liability.toFixed(2) * 1.0;

            // Profit/Loss
            result.profit = fix(backReturn - result.liability - backStake);
            result.lostProfit = fix(result.layProfit - backStake);
            result.profitDetails = " / " + result.lostProfit;

            result.isProfit = result.lostProfit >= 0;
            result.isOk = !result.isProfit && (Math.abs(result.lostProfit) / backStake < 0.015);
            result.enough = size * 1.0 >= result.layStake;

            return result;
        };

        this.calcFreebet = (backOdds, layOdds, backStake, layCommission, size) => {
            const layCommissionPc = layCommission / 100
            const result = {
                backStake: backStake,
                profit: NaN,
                isProfit: false,
                layOdds: layOdds,
                valid: true
            };

            var backReturnSNR = (backOdds - 1) * backStake;

            result.layStake = backReturnSNR / (layOdds - layCommissionPc);
            result.layStake = result.layStake.toFixed(2) * 1.0;

            // Lay risk (liability)
            result.liability = result.layStake * (layOdds - 1);
            result.liability = result.liability.toFixed(2);

            // Profit/Loss
            result.backProfit = backReturnSNR - result.liability;
            result.layProfit = result.layStake * (1 - layCommissionPc);
            result.profit = fix(result.backProfit);
            result.profitDetails = " (" + fix(result.profit / backStake * 100) + "%)";

            result.isProfit = true;
            result.isOk = false;
            result.enough = size * 1.0 >= result.layStake;

            return result;
        }
    }
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
        module.exports = new Calc();
    else
        window.Calc = Calc;
})()