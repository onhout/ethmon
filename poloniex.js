import API from 'poloniex-api';
import config from "./config.json";
import moment from 'moment';

const TradingApi = API.tradingApi.create(config.poloniex_key, config.poloniex_secret);
const PublicApi = API.publicApi.create();
const PushApi = API.pushApi;


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
    }

    chartData() {
        let now = moment.now();
        let obj = this;
        for (let x = 0, ln = obj.currency_pairs.length; x < ln; x++) {
            setTimeout(function (y) {
                // PublicApi.returnChartData({
                //     currencyPair: obj.currency_pairs[y].marketName,
                //     start: (now / 1000) - 1800,
                //     end: 9999999999,
                //     period: 300
                // }).then((data) => {
                //     console.log(data.body);
                // });
            }, x * 500, x); // we're passing x
        }
        // PublicApi.returnChartData({
        //     currencyPair: "BTC_XMR",
        //     start: (now / 1000) - 1800,
        //     end: 9999999999,
        //     period: 300
        // }).then((data) => {
        //     console.log(data.body);
        // });
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
            rate: data.buy_price * 0.5
        })
            .then(msg => {
                let order = JSON.parse(msg.body);
                obj.socket.emit('alert', {text: 'Creating order number #' + order.orderNumber, priority: 'success'});
            })
            .catch(err => console.log(err));

        let checkOrders = setInterval(() => {
            TradingApi.returnOpenOrders({currencyPair: data.marketName})
                .then((msg) => {
                    let openOrders = JSON.parse(msg.body);
                    if (openOrders[0]) {
                        console.log('Buying...');
                    } else {
                        setTimeout(() => {
                            clearInterval(checkOrders);
                            TradingApi.returnBalances()
                                .then((msg) => {
                                    let currency = data.marketName.replace("BTC_", "");
                                    let List = JSON.parse(msg.body);
                                    TradingApi.sell({
                                        currencyPair: data.marketName,
                                        amount: List[currency],
                                        rate: data.sell_price,
                                    })
                                        .then(msg => {
                                            let sellOrder = JSON.parse(msg.body);
                                            obj.socket.emit('alert', {text: 'Sell order listed', priority: 'success'});
                                            console.log(sellOrder);
                                        })
                                        .catch(err => console.log(err))
                                });
                        }, 2000)
                    }
                })
                .catch(err => console.log(err));
        }, 5000);
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
                        if (key.includes('BTC_') && marketjson[key]['baseVolume'] > 500) {
                            magic['marketName'] = key;
                            modifiedJson.push(magic);
                        }
                    }
                }
                obj.currency_pairs = modifiedJson;
                socket.emit("poloniex market", modifiedJson);
            })
            .catch(err => console.log(err));
    }

    returnOrders() {
        let obj = this;
        let socket = this.socket;
        TradingApi.returnCompleteBalances()
            .then((msg) => {
                let balancejson = JSON.parse(msg.body);
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
            .catch(err => console.log(err));

        TradingApi.returnOpenOrders({currencyPair: 'all'})
            .then((msg) => {

                let openOrders = JSON.parse(msg.body);
                let modifiedJson = [];
                for (let key in openOrders) {
                    if (openOrders.hasOwnProperty(key)) {
                        let magic = openOrders[key];
                        if (magic[0]) {
                            modifiedJson.push({orders: magic, marketName: key});
                        }
                    }
                }
                obj.openOrders = modifiedJson;
                socket.emit("poloniex open orders", modifiedJson);
            })
            .catch(err => console.log(err));
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
            .catch(err => console.log(err));
    }
}

export default PoloniexMon;