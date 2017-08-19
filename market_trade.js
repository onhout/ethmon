import bittrex from "node.bittrex.api";

const config = require('./config.json');

//Market class


class Market {
    constructor() {
        bittrex.options({
            'apikey': config.bittrex_key,
            'apisecret': config.bittrex_secret
        });

        this.startingBTC = 0;
        this.startingETH = 0;
        this.trades = 0;
        this.totalDollar = 0;
        this.percentageEarnedBTC = 0;
        this.percentageEarnedETH = 0
    }

    /**
     * @return {number}
     */
    static get BittrexFee() {
        return 1.0025;
    }

    /**
     * @return {number}
     */
    static get FeesForBittrex() {
        return 0.9975
    }

    /**
     * @return {number}
     */
    static get MinTradeBTC() {
        return 0.0005
    }

    static parseCurrency(data, callback) {
        let currencyMatch = [
            'USDT-NEO',
            'USDT-BCC',
            'USDT-BTC',
            'USDT-DASH',
            'USDT-ETC',
            'USDT-ETH',
            'USDT-LTC',
            'USDT-XMR',
            'USDT-XRP',
            'USDT-ZEC'];
        let currencies = {};
        data.forEach((ele) => {
            currencyMatch.forEach((match) => {
                if (ele.MarketName === match) {
                    currencies[match.replace('USDT-', '')] = ele.Last;
                }
            })
        });
        callback(currencies);
    }

    static BTCETHDiff(market, currency) {
        let ETHtoBTC = currency.Last;
        let BTCETH = [];
        market.btc.forEach((ele) => {
            let BtcBuyPrice = (parseFloat(ele.Ask));
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let EthSellPrice = (market.eth.find(name => name.MarketName.slice(4, name.MarketName.length) === str)) || 1;
            let Percentage = (100 - ((BtcBuyPrice * Market.FeesForBittrex) / (EthSellPrice.Bid * ETHtoBTC * Market.FeesForBittrex)) * 100).toFixed(4);
            if (parseFloat(Percentage)) {
                BTCETH.push({
                    name: ele.MarketName,
                    percent: parseFloat(Percentage),
                    BUY: ele.Ask,
                    SELL: EthSellPrice.Bid
                });
            }
        });

        return BTCETH.sort(function (a, b) {
            return b.percent - a.percent;
        });
    }

    static ETHBTCDiff(market, currency) {
        let BTCtoETH = 1 / currency.Last;
        let ETHBTC = [];
        market.eth.forEach((ele) => {
            let EthBuyPrice = (parseFloat(ele.Ask));
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let BtcSellPrice = (market.btc.find(name => name.MarketName.slice(4, name.MarketName.length) === str)) || 1;
            let Percentage = (100 - ((EthBuyPrice * Market.FeesForBittrex) / (BtcSellPrice.Bid * BTCtoETH * Market.FeesForBittrex)) * 100).toFixed(4);
            if (parseFloat(Percentage)) {
                ETHBTC.push({
                    name: ele.MarketName,
                    percent: parseFloat(Percentage),
                    BUY: ele.Ask,
                    SELL: BtcSellPrice.Bid
                });
            }
        });

        return ETHBTC.sort(function (a, b) {
            return b.percent - a.percent;
        });
    }

    getETHBTCMarkets(callback) {
        bittrex.getmarketsummaries((data, err) => {
            let ETHMarket = data.result.filter(ele => (ele.MarketName.indexOf('ETH-') === 0 && ele.BaseVolume > 1000));
            let BTCMarket = ETHMarket.map((ele) => {
                let BTCs = data.result.filter(ele => ele.MarketName.indexOf('BTC-') === 0);
                let str = ele.MarketName.slice(4, ele.MarketName.length);
                return BTCs.find(name => name.MarketName.slice(4, name.MarketName.length) === str);
            });
            BTCMarket.push(data.result.find(name => name.MarketName === 'BTC-ETH'));
            if (err) {
                return console.error(err);
            }
            Market.parseCurrency(data.result, (currency) => {
                bittrex.getbalances((balances, err) => {
                    let market = {eth: ETHMarket, btc: BTCMarket};
                    let balance = balances.result.filter((bal) => {
                        return bal.Balance > Market.MinTradeBTC;
                    });
                    if (err) {
                        console.log("ERROR")
                    } else {
                        callback({
                            balances: balance,
                            currency: currency,
                            market_data: market,
                            ETHtoBTCRate: data.result.find(name => name.MarketName === 'BTC-ETH').Last,
                            BTCtoETHRate: (1 / data.result.find(name => name.MarketName === 'BTC-ETH').Last),
                            BTCETH: Market.BTCETHDiff(market, data.result.find(name => name.MarketName === 'BTC-ETH')),
                            ETHBTC: Market.ETHBTCDiff(market, data.result.find(name => name.MarketName === 'BTC-ETH'))
                        })
                    }
                })
            })
        });
    }

    startTrade(socket) {
        socket.emit('btnState', {start: true, stop: false});
        let obj = this;
        let BUYORDERTICK = 0,
            SELLORDERTICK = 0,
            sellOptionMarketName = '',
            BUYFROM = {},
            buyOptions = {},
            sellOptions = {},
            percentageMade = 0;

        this.getETHBTCMarkets((market_data) => {
            let money = market_data.balances.find(n => (n.Currency === 'BTC' && n.Available > Market.MinTradeBTC))
                ? market_data.balances.find(n => (n.Currency === 'BTC' && n.Available > Market.MinTradeBTC))
                : market_data.balances.find(n => (n.Currency === 'ETH' && n.Available > Market.MinTradeBTC));

            let BUYRATE = 0;
            let SELLRATE = 0;
            console.log('-----------------------------START--------------------------------');
            if (money) {
                if (money.Currency === 'BTC') {
                    if (obj.startingBTC === 0) {
                        obj.startingBTC = money.Available;
                    }
                    BUYFROM = market_data.BTCETH[0];
                    sellOptionMarketName = 'ETH-';
                    BUYRATE = (BUYFROM.BUY).toFixed(6);
                    SELLRATE = (BUYFROM.SELL * market_data.ETHtoBTCRate).toFixed(6);
                    console.log('Starting Money: ' + obj.startingBTC + ' BTCs');
                    console.log('Money Available: ' + money.Available + ' BTCs ($' + money.Available * market_data.currency.BTC + ') | Made: ' + (1 - (obj.startingBTC / money.Available)));
                } else if (money.Currency === 'ETH') {
                    if (obj.startingETH === 0) {
                        obj.startingETH = money.Available;
                        obj.percentageEarnedETH = (1 - (obj.startingETH / money.Available));
                    }
                    BUYFROM = market_data.ETHBTC[0];
                    sellOptionMarketName = 'BTC-';
                    BUYRATE = (BUYFROM.BUY * market_data.ETHtoBTCRate).toFixed(6);
                    SELLRATE = (BUYFROM.SELL).toFixed(6);
                    console.log('Starting Money: ' + obj.startingETH + ' ETHs');
                    console.log('Money Available: ' + money.Available + ' ETHs ($' + money.Available * market_data.currency.ETH + ') | Made: ' + (1 - (obj.startingETH / money.Available)));
                }
                buyOptions = {
                    market: BUYFROM.name,
                    quantity: (money.Available / BUYFROM.BUY) * Market.FeesForBittrex,
                    rate: BUYFROM.BUY
                };
                console.log('Top market: ' + BUYFROM.name + '| Buy: BTC ' + BUYRATE + '| Sell: BTC ' + SELLRATE + '| GAIN: ' + BUYFROM.percent + '%');
                console.log('Total Trades: ' + obj.trades);

                socket.emit('watch data', {
                    startingBTC: obj.startingBTC,
                    startingETH: obj.startingETH,
                    totalTrade: obj.trades,
                    totalDollarBTC: money.Available * market_data.currency.BTC,
                    totalDollarETH: money.Available * market_data.currency.ETH,
                    currentCOINName: money.Currency,
                    currentAvailable: money.Available,
                    currentMarket: buyOptions.market,
                    currentMarketBuyRate: BUYRATE,
                    currentMarketSellRate: SELLRATE,
                    currentQuantity: buyOptions.quantity,
                    currentPercent: BUYFROM.percent,
                    percentGain: percentageMade
                })
                if (BUYFROM.percent > 0.5) {
                    bittrex.getorderbook({market: buyOptions.market, type: 'both'}, (data) => {
                        if (data.result.buy[0].Quantity > buyOptions.quantity && data.result.sell[0].Quantity > (buyOptions.quantity * 2)) {
                            console.log('=========BUYING: ' + buyOptions.market + '==QUANTITY: ' + buyOptions.quantity.toFixed(6) + '==RATE: ' + buyOptions.rate.toFixed(6) + '=========');
                            bittrex.buylimit(buyOptions, function (buy_data, err) {
                                obj.trades++;
                                if (err) {
                                    console.log(err);
                                    return 0;
                                }
                                let checkOrder = setInterval(() => {
                                    bittrex.getorder(buy_data.result, function (buyorder, err) {
                                        if (err) {
                                            console.log(err);
                                            return 0;
                                        } else {
                                            BUYORDERTICK++;
                                            if (buyorder.result) {
                                                console.log(BUYORDERTICK + ' : BUY Order still open in market: ' + BUYFROM.name + ': ' + buyorder.result.IsOpen);
                                                if (buyorder.result.IsOpen === false && BUYORDERTICK < 10) {
                                                    BUYORDERTICK = 0;
                                                    clearInterval(checkOrder);
                                                    sell(buyorder);
                                                } else if (buyorder.result.IsOpen === true && BUYORDERTICK >= 10) {
                                                    BUYORDERTICK = 0;
                                                    bittrex.cancel(buy_data.result, function (cancel) {
                                                        clearInterval(checkOrder);
                                                        console.log("BUY Order canceled: " + cancel.success);
                                                    })
                                                }
                                            }
                                        }
                                    });
                                }, 1000)
                            })
                        } else {
                            console.log('Not enough quantity, forget it.');
                            console.log('**Want to buy: ' + buyOptions.quantity + '| have: ' + data.result.buy[0].Quantity + '**');
                            console.log('**Want to sell: ' + buyOptions.quantity + '| have: ' + data.result.sell[0].Quantity + '**');
                        }
                    });
                }
            } else {
                bittrex.getopenorders({}, function (data) {
                    data.forEach((dat) => {
                        bittrex.cancel({uuid: dat.OrderUuid}, (cancelEverything, err) => {
                            if (err) {
                                return 0;
                            } else {
                                console.log("Order that was stuck was released.")
                            }
                        })
                    })
                });
                setTimeout(() => {
                    bittrex.getbalances((balances) => {
                        balances.result.forEach((bal) => {
                            if (bal.Currency != 'BTC') {
                                bittrex.getticker({market: 'BTC-' + bal.Currency}, (ticker) => {
                                    let sellOff = {
                                        market: "BTC-" + bal.Currency,
                                        quantity: bal.Available,
                                        rate: ticker.result.Bid
                                    };
                                    bittrex.selllimit(sellOff, (sell, err) => {
                                        if (err) {
                                            return 0;
                                        } else {
                                            console.log("RESET AND SELL ALL COINS TO BTC");
                                        }
                                    })
                                })
                            }
                        })
                    });
                }, 2000)
            }
        });

        function safe_sell() {
            setTimeout(() => {
                bittrex.getbalances((SELLBAL) => {
                    SELLBAL.result.forEach((D) => {
                        if (D.Currency != 'BTC' && D.Currency != 'ETH') {
                            bittrex.getticker({market: sellOptionMarketName + D.Currency}, (ticker) => {
                                let sellOff = {
                                    market: sellOptionMarketName + D.Currency,
                                    quantity: D.Balance,
                                    rate: ticker.result.Bid
                                };
                                bittrex.selllimit(sellOff, (sell, err) => {
                                    if (err) {
                                        return 0;
                                    } else {
                                        console.log("SOLD TO " + sellOptionMarketName + D.Currency + ' @ ' + ticker.result.Bid);
                                    }
                                })
                            })
                        }
                    })

                })
            }, 3000);
        }

        function sell(buyorder) {
            sellOptions = {
                market: sellOptionMarketName + BUYFROM.name.slice(4, BUYFROM.name.length),
                quantity: buyorder.result.Quantity,
                rate: BUYFROM.SELL
            };
            console.log('=========SELLING: ' + sellOptions.market + '==QUANTITY: ' + sellOptions.quantity.toFixed(6) + '==RATE: ' + sellOptions.rate.toFixed(6) + '=========');
            bittrex.selllimit(sellOptions, function (sell_data, err) {
                if (err) {
                    console.log(err);
                    safe_sell()
                } else {
                    let checkSellOrder = setInterval(() => {
                        bittrex.getorder(sell_data.result, function (sellorder, err) {
                            if (err) {
                                console.log(err);
                                safe_sell()
                            } else {
                                SELLORDERTICK++;
                                if (sellorder.result) {
                                    console.log(SELLORDERTICK + ' : SELL Order still open in market: ' + sellOptionMarketName + ': ' + sellorder.result.IsOpen);
                                    if (sellorder.result.IsOpen === false && SELLORDERTICK < 5) {
                                        SELLORDERTICK = 0;
                                        clearInterval(checkSellOrder);
                                        console.log("ALL DONE!!!");
                                    } else if (sellorder.result.IsOpen === true && SELLORDERTICK >= 5) {
                                        SELLORDERTICK = 0;
                                        clearInterval(checkSellOrder);
                                        bittrex.cancel(sell_data.result, function (cancel, err) {
                                            console.log('Cancelling Sell Order and getting the most recent price for quick sale...');
                                            if (err) {
                                                console.log(err);
                                            } else if (cancel.success) {
                                                safe_sell();
                                            }
                                        });
                                    }
                                }
                            }
                        })
                    }, 1000)
                }
            })
        }
    }

    altCoinSellOff() {
        bittrex.getopenorders({}, function (data) {
            data.forEach((dat) => {
                bittrex.cancel({uuid: dat.OrderUuid}, (cancelEverything, err) => {
                    if (err) {
                        return 0;
                    } else {
                        console.log("Order that was stuck was released.")
                    }
                })
            })
        });
        setTimeout(() => {
            bittrex.getbalances((balances) => {
                balances.result.forEach((bal) => {
                    if (bal.Currency != 'BTC') {
                        bittrex.getticker({market: 'BTC-' + bal.Currency}, (ticker) => {
                            let sellOff = {
                                market: "BTC-" + bal.Currency,
                                quantity: bal.Available,
                                rate: ticker.result.Bid
                            };
                            bittrex.selllimit(sellOff, (sell, err) => {
                                if (err) {
                                    return 0;
                                } else {
                                    console.log("SOLD ALL ALTCOINS TO BTC");
                                }
                            })
                        })
                    }
                })

            })
        }, 2000)

    }


}

export default Market;