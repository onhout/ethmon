import bittrex from "node.bittrex.api";

const config = require('./config.json');

//Market class


class Tradev3 {
    constructor() {
        bittrex.options({
            'apikey': config.bittrex_key,
            'apisecret': config.bittrex_secret
        });

        this.startingBTC = 0;
        this.startingETH = 0;
        this.trades = 0;
        this.successfulTrades = 0;
        this.totalDollar = 0;
        this.percentageEarnedBTC = 0;
        this.percentageEarnedETH = 0
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
        let ETHtoBTC = currency.Bid;
        let BTCETH = [];
        market.btc.forEach((ele) => {
            let BtcBuyPrice = (parseFloat(ele.Ask));
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let EthSellPrice = (market.eth.find(name => name.MarketName.slice(4, name.MarketName.length) === str)) || 1;
            let Percentage = ((1 - ((BtcBuyPrice * Tradev3.FeesForBittrex) / (EthSellPrice.Bid * ETHtoBTC * Tradev3.FeesForBittrex))) * 100).toFixed(4);
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
        let BTCtoETH = 1 / currency.Bid;
        let ETHBTC = [];
        market.eth.forEach((ele) => {
            let EthBuyPrice = (parseFloat(ele.Ask));
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let BtcSellPrice = (market.btc.find(name => name.MarketName.slice(4, name.MarketName.length) === str)) || 1;
            let Percentage = ((1 - ((EthBuyPrice * Tradev3.FeesForBittrex) / (BtcSellPrice.Bid * BTCtoETH * Tradev3.FeesForBittrex))) * 100).toFixed(4);
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
            let BTCETHMarket = data.result.find(name => name.MarketName === 'BTC-ETH');
            BTCMarket.push(BTCETHMarket);
            if (err) {
                return console.error(err);
            }
            Tradev3.parseCurrency(data.result, (currency) => {
                bittrex.getbalances((balances, err) => {
                    let market = {eth: ETHMarket, btc: BTCMarket};
                    let balance = balances.result.filter((bal) => {
                        return bal.Balance > Tradev3.MinTradeBTC;
                    });
                    if (err) {
                        console.log("ERROR")
                    } else {
                        callback({
                            balances: balance,
                            currency: currency,
                            market_data: market,
                            ETHtoBTCRate: BTCETHMarket.Bid,
                            BTCtoETHRate: (1 / BTCETHMarket.Ask),
                            BTCETH: Tradev3.BTCETHDiff(market, BTCETHMarket),
                            ETHBTC: Tradev3.ETHBTCDiff(market, BTCETHMarket)
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
            sellOptionMarketName = '',
            BUYFROM = {},
            SELLFROM = {};

        this.getETHBTCMarkets((market_data) => {
            bittrex.getbalance({currency: "BTC"}, (MONEY) => {
                let money = MONEY.result;
                console.log('--------------------------------START----------------------------------');
                if (money.Available > 0.0005) {
                    if (obj.startingBTC === 0) {
                        obj.startingBTC = money.Available;
                    }
                    BUYFROM = market_data.BTCETH[0];
                    SELLFROM = market_data.ETHBTC[0];
                    sellOptionMarketName = 'ETH-';
                    BUYFROM.BUYRATE = (BUYFROM.BUY).toFixed(8);
                    BUYFROM.SELLRATE = (BUYFROM.SELL * market_data.ETHtoBTCRate).toFixed(8);
                    BUYFROM.EtoBRate = market_data.ETHtoBTCRate;

                    SELLFROM.BUYRATE = (SELLFROM.BUY).toFixed(8);
                    SELLFROM.SELLRATE = (SELLFROM.SELL * market_data.BTCtoETHRate).toFixed(8);
                    SELLFROM.BtoERate = market_data.BTCtoETHRate;

                    console.log('Starting Money: ' + obj.startingBTC + ' BTCs');
                    console.log('Money Available: ' + money.Available + ' BTCs ($' + money.Available * market_data.currency.BTC + ') | Made: ' + (1 - (obj.startingBTC / money.Available)));
                    console.log('Top market(BTC-ETH): ' + BUYFROM.name + ' | Buy: BTC ' + BUYFROM.BUYRATE + ' | Sell: BTC ' + BUYFROM.SELLRATE);
                    console.log('Top market(ETH-BTC): ' + SELLFROM.name + ' | Buy: ETH ' + SELLFROM.BUYRATE + ' | Sell: ETH ' + SELLFROM.SELLRATE);
                    console.log('Total Trades: ' + obj.trades + ' | Successful Trades: ' + obj.successfulTrades);
                    let BITEREE = (0.990037438 * money.Available * BUYFROM.SELL * SELLFROM.SELL) / (BUYFROM.BUY * SELLFROM.BUY);
                    let TruEarnPercent = (1 - (money.Available / BITEREE)) * 100;

                    console.log('Calculated final: ' + BITEREE);
                    console.log('Percent Gain: ' + TruEarnPercent + '%');


                    let EthQuantity = (money.Available * BUYFROM.SELL) / BUYFROM.BUY;
                    let BuyEthQuantity = EthQuantity / SELLFROM.BUY;

                    // socket.emit('watch data', {
                    //     startingBTC: obj.startingBTC,
                    //     startingETH: obj.startingETH,
                    //     totalTrade: obj.trades,
                    //     totalDollarBTC: money.Available * market_data.currency.BTC,
                    //     totalDollarETH: money.Available * market_data.currency.ETH,
                    //     currentCOINName: money.Currency,
                    //     currentAvailable: money.Available,
                    //     currentMarket: buyOptions.market,
                    //     currentMarketBuyRate: BUYRATE,
                    //     currentMarketSellRate: SELLRATE,
                    //     currentQuantity: buyOptions.quantity,
                    //     currentPercent: BUYFROM.percent,
                    //     percentGain: percentageMade
                    // })
                    if (BITEREE > (money.Available * 1.001)) {
                        BUYFROM.buyOptions = {
                            market: BUYFROM.name,
                            quantity: (money.Available / BUYFROM.BUY) * Tradev3.FeesForBittrex,
                            rate: BUYFROM.BUY
                        };
                        bittrex.getorderbook({market: BUYFROM.name, type: 'both'}, (buy_order_book) => {
                            bittrex.getorderbook({market: SELLFROM.name, type: 'both'}, (sell_order_book) => {
                                if (buy_order_book.result.buy[0].Quantity > BUYFROM.buyOptions.quantity &&
                                    buy_order_book.result.sell[0].Quantity > (BUYFROM.buyOptions.quantity * 2) &&
                                    sell_order_book.result.buy[0].Quantity > BuyEthQuantity * 2 &&
                                    sell_order_book.result.sell[0].Quantity > BuyEthQuantity * 2) {
                                    console.log('=========BUYING: ' + BUYFROM.buyOptions.market + '==RATE: ' + BUYFROM.buyOptions.rate.toFixed(8) + '=========');
                                    bittrex.buylimit(BUYFROM.buyOptions, function (buy_data, err) {
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
                                                    console.log(BUYORDERTICK + ' : BUY Order still open in market: ' + BUYFROM.name + ': ' + buyorder.result.IsOpen);
                                                    if (buyorder.result.IsOpen === false && BUYORDERTICK < 5) {
                                                        obj.trades++;
                                                        BUYORDERTICK = 0;
                                                        clearInterval(checkOrder);
                                                        safe_sell('ETH-', BUYFROM.EtoBRate);
                                                        sellETHtoBTC(SELLFROM)
                                                    } else if (buyorder.result.IsOpen === true && BUYORDERTICK >= 5) {
                                                        BUYORDERTICK = 0;
                                                        bittrex.cancel(buy_data.result, function (cancel) {
                                                            clearInterval(checkOrder);
                                                            console.log("BUY Order canceled: " + cancel.success);
                                                        })
                                                    }
                                                }
                                            });
                                        }, 1000)
                                    })
                                } else {
                                    console.log('Not enough quantity, forget it.');
                                    console.log('**Want to buy(BTC): ' + BUYFROM.buyOptions.quantity + '| have: ' + buy_order_book.result.buy[0].Quantity + '**');
                                    console.log('**Want to sell(BTC): ' + BUYFROM.buyOptions.quantity + '| have: ' + buy_order_book.result.sell[0].Quantity + '**');
                                    console.log('**Want to buy(ETH): ' + BuyEthQuantity + '| have: ' + sell_order_book.result.buy[0].Quantity + '**');
                                    console.log('**Want to sell(ETH): ' + BuyEthQuantity + '| have: ' + sell_order_book.result.sell[0].Quantity + '**');
                                }
                            });
                        });
                    } else {
                        console.log('Percentage gain must be > 0.1%');
                    }
                } else {
                    safe_sell('BTC-', true, 1)
                }
            })
        });

        function sellETHtoBTC(SELLFROM) {
            setTimeout(() => {
                bittrex.getbalance({currency: "ETH"}, (MONEY) => {
                    let money = MONEY.result;
                    if (money) {
                        SELLFROM.buyOptions = {
                            market: SELLFROM.name,
                            quantity: (money.Available / SELLFROM.BUY) * Tradev3.FeesForBittrex,
                            rate: SELLFROM.BUY
                        };

                        console.log('=========BUYING: ' + SELLFROM.buyOptions.market + '==RATE: ' + SELLFROM.buyOptions.rate.toFixed(8) + '=========');
                        bittrex.buylimit(SELLFROM.buyOptions, function (buy_data, err) {
                            if (err) {
                                console.log(err);
                                return 0;
                            } else {
                                safe_sell('BTC-', SELLFROM.BtoERate);
                                obj.successfulTrades++;
                            }
                        });
                    }
                })
            }, 6000)
        }

        function safe_sell(target_market, SELLRATE) {
            bittrex.getopenorders({}, function (data) {
                data.result.forEach((dat) => {
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
                bittrex.getbalances((SELLBAL) => {
                    SELLBAL.result.forEach((D) => {
                        let TMarket = '';
                        if (D.Currency != 'BTC' && D.Currency != 'ETH') {
                            TMarket = target_market + D.Currency;
                        } else if (D.Currency === 'ETH') {
                            TMarket = 'BTC-ETH';
                        }
                        bittrex.getticker({market: TMarket}, (ticker, err) => {
                            if (err) return 0;
                            let sellOff = {
                                market: TMarket,
                                quantity: D.Available,
                                rate: ticker.result.Bid
                            };
                            bittrex.selllimit(sellOff, (sell, err) => {
                                if (err) {
                                    return 0;
                                } else {
                                    console.log("SOLD TO " + TMarket + ' @ ' + (ticker.result.Bid * SELLRATE) + ' BTCs');
                                }
                            })
                        })
                    })

                })
            }, 3000);
        }
    }
}

export default Tradev3;