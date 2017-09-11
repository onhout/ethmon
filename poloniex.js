import API from "poloniex-api";
import config from "./config.json";
import moment from "moment";
import Pushover from "pushover-notifications";

const MACD = require('technicalindicators').MACD;
const TradingApi = API.tradingApi.create(config.poloniex_key, config.poloniex_secret);
const PublicApi = API.publicApi.create();
const PushApi = API.pushApi;

const p = new Pushover({
    user: 'us7CARhU1Rw6WXpLEYy2aLjAiaTkCH',
    token: 'aufx54z8fxrkchnkqgj2whv1sed7if',
});


// console.log(TradingApi.pushApi);

// const tradingApi = TradingApi.create(YOUR_POLONIEX_API_KEY, YOUR_POLONIEX_SECRET_KEY);

// PushApi.create({subscriptionName: 'ticker', currencyPair: 'BTC_ETH'}, (obj) => {
//     console.log(obj)
// });


class PoloniexMon {
    constructor(socket) {
        this.socket = socket;
        this.currency_pairs = [];
        this.balanceSheet = {};
        this.openOrders = {};
        this.pushMark = false;
        this.chartData = [];
        this.chartInterval = false;
        this.notifiedMACD = [];
        this.btcPortfolio = 0;
    }


    collect_chartData() {
        let obj = this;

        setInterval(() => {
            obj.notifiedMACD = [];
        }, 255555);
        if (!obj.chartInterval) {
            get_chart(moment.now());
            obj.chartInterval = setInterval(() => {
                let now = moment.now();
                get_chart(now)
            }, obj.currency_pairs.length * 2 * 1337);
        }

        function get_chart(now) {
            for (let x = 0, ln = obj.currency_pairs.length; x < ln; x++) {
                setTimeout(function (y) {
                    if (obj.currency_pairs[y].marketName) {
                        PublicApi.returnChartData({
                            currencyPair: obj.currency_pairs[y].marketName,
                            start: (now / 1000) - 21600,
                            end: 9999999999,
                            period: 300
                        })
                            .then((data) => {
                                let chartData = JSON.parse(data.body);
                                if (x === obj.currency_pairs.length) {
                                    obj.chartData = [];
                                }
                                obj.chartData.push({
                                    data: chartData,
                                    name: obj.currency_pairs[y].marketName,
                                    MACD: getMACD(chartData, obj.currency_pairs[y].marketName)
                                });
                                if (x === obj.currency_pairs.length - 1) {
                                    obj.socket.emit('chart data', obj.chartData);
                                    obj.chartData = [];
                                }
                            })
                            .catch(err => console.log('returnChartData error: ' + err.code));
                    } else {
                        console.log('Wheres the name?');
                        console.log(obj.currency_pairs[y]);
                    }
                }, x * 1337, x); // we're passing x
            }
        }

        function getMACD(chartData, marketName) {
            let macdValues = [];
            chartData.forEach(function (dat) {
                macdValues.push(dat.close); //high, low, open, close weightedAverage
            });
            let rawCalc = MACD.calculate({
                values: macdValues,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            });

            // if (rawCalc[rawCalc.length - 3].histogram < 0 &&
            //     rawCalc[rawCalc.length - 2].histogram < 0 &&
            //     rawCalc[rawCalc.length - 1].histogram > 0 &&
            //     rawCalc[rawCalc.length - 1].MACD < 0 &&
            //     rawCalc[rawCalc.length - 1].signal < 0 &&
            //     obj.btcPortfolio > 0.00001 &&
            //     obj.notifiedMACD.indexOf(marketName) === -1
            // ) {
            //     obj.notifiedMACD.push(marketName);
            //     obj.pushNotification(marketName + ' - MACD BANG BANG is going crazy! Check it!',
            //         'https://m.poloniex.com/#/exchange/' + marketName.toLowerCase());
            // }
            return rawCalc;
        }
    }

    buySell(data) {
        let obj = this;
        let availableValue = '';
        obj.balanceSheet.forEach((ele) => {
            if (ele.marketName === 'BTC') {
                availableValue = ele.btcValue;
            }
        });
        let purchaseAmount = availableValue / data.buy_price;

        TradingApi.buy({
            currencyPair: data.marketName,
            amount: purchaseAmount * data.percentage,
            rate: data.buy_price
        })
            .then(msg => {
                let order = JSON.parse(msg.body);
                return new Promise((resolve, reject) => {
                    resolve(order.orderNumber);
                });
            })
            .then(orderNumber => {
                obj.socket.emit('alert', {text: 'Creating buy order #' + orderNumber, priority: 'success'});
                let checkOrders = setInterval(() => {
                    TradingApi.returnOpenOrders({currencyPair: data.marketName})
                        .then((msg) => {
                            let openOrders = JSON.parse(msg.body);
                            if (openOrders[0] && openOrders.find(order => {
                                    return order.type === 'buy'
                                })) {
                                console.log('Buying...');
                            } else {
                                setTimeout(() => {
                                    clearInterval(checkOrders);
                                    TradingApi.returnBalances()
                                        .then((msg) => {
                                            let currency = data.marketName.replace("BTC_", "");
                                            let List = JSON.parse(msg.body);
                                            if (List[currency] > 0) {
                                                TradingApi.sell({
                                                    currencyPair: data.marketName,
                                                    amount: List[currency],
                                                    rate: data.sell_price,
                                                })
                                                    .then((msg) => {
                                                        let sellOrder = JSON.parse(msg.body);
                                                        obj.socket.emit('alert', {
                                                            text: 'Created sell order #' + sellOrder.orderNumber,
                                                            priority: 'success'
                                                        });
                                                        obj.pushMark = true;
                                                    })
                                                    .catch(err => console.log('SELL error: ' + err.code))
                                            }
                                        });
                                }, 3000)
                            }
                        })
                        .catch(err => console.log('returnOpenOrders error: ' + err.code));
                }, 5000);

            })
            .catch(error => console.log('BUY error: ' + err.code));
    }

    returnMarket() {
        let obj = this;
        let socket = this.socket;

        PublicApi.returnTicker()
            .then((msg) => {
                let marketjson = JSON.parse(msg.body);
                let modifiedJson = [];
                for (let key in marketjson) {
                    if (marketjson.hasOwnProperty(key)) {
                        let magic = marketjson[key];
                        if (key.includes('BTC_') && marketjson[key]['baseVolume'] > 200) {
                            magic['marketName'] = key;
                            modifiedJson.push(magic);
                        }
                    }
                }
                obj.currency_pairs = modifiedJson.sort(function (a, b) {
                    return a.marketName.localeCompare(b.marketName);
                });
                socket.emit("poloniex market", obj.currency_pairs);
            })
            .catch(err => console.log('returnMarket error: ' + err.code));
    }

    returnBalances() {
        let obj = this;
        let socket = this.socket;
        TradingApi.returnCompleteBalances()
            .then((msg) => {
                let balancejson = JSON.parse(msg.body);
                obj.btcPortfolio = balancejson['BTC'].available;
                let modifiedJson = [];
                for (let key in balancejson) {
                    if (balancejson.hasOwnProperty(key)) {
                        let magic = balancejson[key];
                        if (magic.btcValue > 0) {
                            magic['marketName'] = key;
                            modifiedJson.push(magic);
                        }
                    }
                }
                if (modifiedJson[0]) {
                    obj.balanceSheet = modifiedJson;
                }
                socket.emit("poloniex balance", obj.balanceSheet);
            })
            .catch(err => console.log('returnBalances error: ' + err.code));
    }

    returnOrders() {
        let obj = this;
        let socket = this.socket;

        TradingApi.returnOpenOrders({currencyPair: 'all'})
            .then((msg) => {
                let openOrders = JSON.parse(msg.body);
                let modifiedJson = [];
                for (let key in openOrders) {
                    if (openOrders.hasOwnProperty(key)) {
                        let magic = openOrders[key];
                        if (magic[0]) {
                            modifiedJson.push({orders: magic, marketName: key});
                            if (magic[0].type === 'sell') {
                                obj.pushMark = true;
                            }
                        }
                    }
                }

                obj.openOrders = modifiedJson;
                if (!modifiedJson[0] && obj.pushMark) {
                    obj.pushMark = false;
                    obj.pushNotification('There are no more open orders');
                } else if (modifiedJson[0] && modifiedJson[0].marketName !== 'error') {
                    socket.emit("poloniex open orders", modifiedJson);
                }
            })
            .catch(err => console.log('returnOrders error: ' + err.code));
    }

    cancelOrder(orderNumber) {
        let obj = this;
        TradingApi.cancelOrder({orderNumber})
            .then((msg) => {
                let mes = JSON.parse(msg.body);
                if (mes.success === 1) {
                    obj.socket.emit('alert', {text: mes.message, priority: 'success'})
                } else {
                    obj.socket.emit('alert', {text: mes.message, priority: 'danger'})
                }
            })
            .catch(err => console.log('cancelOrder error: ' + err.code));
    }

    pushNotification(text, url) {
        let obj = this;
        let message = {
            message: text,	// required
            title: "Trade Bot notification",
            sound: 'cash register',
            device: 'minana',
            url: url
        };
        p.send(message, err => {
            if (err) {
                console.log(err)
            }
        });
    }
}

export default PoloniexMon;