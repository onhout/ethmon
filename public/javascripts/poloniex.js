// DOM Ready =============================================================

$(document).ready(() => {
    const socket = io();
    $('input[name="radioOptions"]').change(function () {
        $('#calculatedBTC').text('Buy using BTC: ' + ($('#availableBTC').text() * $('input[name="radioOptions"]:checked').val()).toFixed(8))
    });

    socket.emit('get poloniex market');
    socket.emit('get poloniex orders');
    socket.emit('get chart data');
    socket.on('poloniex market', (data) => {
        const BTCmarketTable = $('#BTCmarketTable tbody');
        BTCmarketTable.html('');
        let tdOnePercent = '';
        let tdThreshold = '';
        let tdHigh = '';
        let tdLow = '';
        let tdLast = '';
        let tdName = '';
        let tdVol = '';
        let tdPercentChange = '';
        let tdActions = '';
        data.forEach((ele) => {
            let range = (ele.lowestAsk - ele.low24hr) / (ele.high24hr - ele.low24hr);
            tdName = '<td id="' + ele.marketName + '_price">' + ele.marketName + '</a></td>';
            tdLast = '<td class="text-warning">' + numeral(ele.last * 1000).format('0,0.00000') + '</td>';
            tdLow = '<td class="text-danger">' + numeral(ele.low24hr * 1000).format('0,0.00000') + '</td>';
            tdHigh = '<td class="text-success">' + numeral(ele.high24hr * 1000).format('0,0.00000') + '</td>';
            tdOnePercent = '<td class="text-info">' + numeral(ele.lowestAsk * 1000 * 1.015).format('0,0.00000') + '</td>';
            tdThreshold = '<td class="text-danger">' + numeral(ele.highestBid * 1000 / 1.015).format('0,0.00000') + '</td>';
            tdPercentChange = '<td class="text-primary">' + numeral(range).format('0.00%') + '</td>';
            tdActions = '<td><button class="btn btn-success btn-sm" id="buy_' + ele.marketName + '">' +
                'BUY @ ' + ele.lowestAsk + '</button>' + '</td>';
            BTCmarketTable.append('<tr>' + tdName + tdLast + tdLow + tdHigh + tdOnePercent + tdThreshold + tdVol + tdPercentChange + tdActions + '</tr>');
            $('#buy_' + ele.marketName).click(function () {
                let percentage = $('input[name="radioOptions"]:checked').val();
                socket.emit('buy and sell now', {
                    marketName: ele.marketName,
                    percentage: percentage,
                    buy_price: ele.lowestAsk,
                    sell_price: ele.lowestAsk * 1.015
                });
            })
        });
    });

    socket.on('poloniex balance', (data) => {
        const balanceTable = $('#PoloBalance tbody');
        const calculatedBTC = $('#calculatedBTC');
        calculatedBTC.text('');
        balanceTable.html('');
        let tdName = '';
        let tdAvailable = '';
        let tdOnorders = '';
        let btcValue = '';
        let totalBtc = 0;
        data.forEach((ele) => {
            tdName = '<td>' + ele.marketName + '</td>';
            tdAvailable = '<td class="text-success" id="available' + ele.marketName + '">' + ele.available + '</td>';
            tdOnorders = '<td class="text-primary">' + ele.onOrders + '</td>';
            btcValue = '<td class="text-success btc-value">' + ele.btcValue + '</td>';
            balanceTable.append('<tr>' + tdName + tdAvailable + tdOnorders + btcValue + '</tr>');
        });
        $('.btc-value').each(function () {
            totalBtc += parseFloat($(this).text());
        });
        balanceTable.append('<tr><td>Total BTC</td><td colspan="3" class="text-center" id="totalBtc">' + totalBtc.toFixed(8) + '</td></tr>');
        calculatedBTC.text('Buy using BTC: ' + ($('#availableBTC').text() * $('input[name="radioOptions"]:checked').val()).toFixed(8))
    });

    socket.on('poloniex open orders', (data) => {
        const openOrders = $('#Orders tbody');
        openOrders.html('');
        let tdOrderNumber = '';
        let tdName = '';
        let tdDate = '';
        let tdRate = '';
        let tdType = '';
        let tdAmount = '';
        let tdTotal = '';
        let tdActions = '';
        data.forEach((ele) => {
            tdName = '<td>' + ele.marketName + '</td>';
            ele.orders.forEach((order) => {
                tdOrderNumber = '<td>' + order.orderNumber + '</td>';
                tdDate = '<td>' + order.date + '</td>';
                tdRate = '<td>' + order.rate + '</td>';
                tdType = '<td>' + order.type + '</td>';
                tdAmount = '<td>' + order.amount + '</td>';
                tdTotal = '<td>' + order.total + '</td>';
                tdActions = '<td><button class="btn btn-danger btn-sm" id="cancel_' + order.orderNumber + '">' +
                    'Cancel Order' + '</button>' + '</td>';
                openOrders.append('<tr>' + tdOrderNumber + tdName + tdDate + tdRate + tdType + tdAmount + tdTotal + tdActions + '</tr>');
                $('#cancel_' + order.orderNumber).click(function () {
                    socket.emit('cancel order', order.orderNumber);
                })
            })
        });
    });

    socket.on('alert', (data) => {
        $('body').append(new Alert(data.text, data.priority));
        setTimeout(() => {
            $('.alert').alert('close')
        }, 5000)
    });

    socket.on('chart data', (data) => {
        const Graphs = $('#Graphs');
        const graphLength = $(window).width() * 0.45;
        let tdGraph = '';
        Graphs.html('');
        data.forEach((current, i) => {
            let MACDnum = parseFloat(current.MACD[current.MACD.length - 1].MACD);
            let Signum = parseFloat(current.MACD[current.MACD.length - 1].signal);
            let positiveCLASS = MACDnum > 0 && Signum ? 'success' : 'danger';
            let positiveTEXT = MACDnum > 0 && Signum ? 'fa-arrow-up' : 'fa-arrow-down';
            if (i % 2 === 0) {
                tdGraph = '<div class="row graphRows-' + i + '">' +
                    '<div class="col">' +
                    '<div class="card text-white">' +
                    '<div class="card-header bg-' + positiveCLASS + '"><a class="h4 text-warning" href="https://poloniex.com/exchange#' + current.name.toLowerCase() + '" target="_blank">' + current.name + '</a>' +
                    '<i class="fa ' + positiveTEXT + ' fa-2x pull-right"></i></div>' +
                    '<div class="card-body bg-dark">' +
                    '<div style="border-bottom: lightpink solid 1px"><svg id="graph_' + current.name + '" width="' + graphLength + '" height="400"></svg></div>' +
                    '<div><svg id="macd_' + current.name + '" width="' + graphLength + '" height="80"></svg></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
                Graphs.append(tdGraph);
            } else {
                tdGraph =
                    '<div class="col">' +
                    '<div class="card text-white">' +
                    '<div class="card-header bg-' + positiveCLASS + '"><a class="h4 text-warning" href="https://poloniex.com/exchange#' + current.name.toLowerCase() + '" target="_blank">' + current.name + '</a>' +
                    '<i class="fa ' + positiveTEXT + ' fa-2x pull-right"></i></div>' +
                    '<div class="card-body bg-dark">' +
                    '<div style="border-bottom: lightpink solid 1px"><svg id="graph_' + current.name + '" width="' + graphLength + '" height="400"></svg></div>' +
                    '<div><svg id="macd_' + current.name + '" width="' + graphLength + '" height="80"></svg></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
                $('.graphRows-' + (i - 1)).append(tdGraph)
            }
        });

        data.forEach((current, i) => {
            let marketChart = new Chart('#graph_' + current.name);
            marketChart.createMarketChart(current.data, current.SMA, current.EMA, 'date', 'close');
            let MACDChart = new Chart('#macd_' + current.name);
            MACDChart.createMACD(current.MACD, current.data);
        })
    });

    socket.on('create chart table', () => {

    })
});