$(() => {
    const socket = io();
    let startBtn = $('#startTrade');
    let stopBtn = $('#stopTrade');
    let sellAltCoins = $('#sellAltCoins');
    let listElements = {
        startingBTC: $('#startingBTC'),
        startingETH: $('#startingETH'),
        totalTrade: $('#totalTrade'),
        totalDollar: $('#totalDollar'),
        currentBTC: $('#currentBTC'),
        currentETH: $('#currentETH'),
        percentageEarnedBTC: $('#percentageEarnedBTC'),
        percentageEarnedETH: $('#percentageEarnedETH'),
        currentMarket: $('#currentMarket'),
        currentMarketBuyRate: $('#currentMarketBuyRate'),
        currentMarketSellRate: $('#currentMarketSellRate'),
        currentQuantity: $('#currentQuantity'),
        currentPercent: $('#currentPercent')
    };


    startBtn.click(function () {
        if (!$(this).hasClass('disabled')) {
            socket.emit('start trade')
        }
    });

    stopBtn.click(function () {
        if (!$(this).hasClass('disabled')) {
            socket.emit('stop trade')
        }
    });

    sellAltCoins.click(function () {
        if (!$(this).hasClass('disabled')) {
            socket.emit('altcoin sell')
        }
    });

    socket.on('btnState', function (data) {
        startBtn.toggleClass("disabled", data.start);
        stopBtn.toggleClass("disabled", data.stop)
    });

    socket.on('watch data', function (data) {
        listElements.startingBTC.text(data.startingBTC);
        listElements.startingETH.text(data.startingETH);
        listElements.totalTrade.text(data.totalTrade);
        listElements.currentMarket.text(data.currentMarket);
        listElements.currentMarketBuyRate.text(data.currentMarketBuyRate);
        listElements.currentMarketSellRate.text(data.currentMarketSellRate);
        listElements.currentQuantity.text(data.currentQuantity);
        listElements.currentPercent.text(data.currentPercent + '%');
        if (data.currentCOINName == "BTC") {
            listElements.currentBTC.text(data.currentAvailable);
            listElements.percentageEarnedBTC.text(numeral(1 - (data.startingBTC / data.currentAvailable)).format('0.0000%'));
            listElements.totalDollar.text(numeral(data.totalDollarBTC).format('$0.0000'));
        } else if (data.currentCOINName == 'ETH') {
            listElements.currentETH.text(data.currentAvailable);
            listElements.percentageEarnedETH.text(numeral(1 - (data.startingETH / data.currentAvailable)).format('0.0000%'));
            listElements.totalDollar.text(numeral(data.totalDollarETH).format('$0.0000'));
        }
    })
});