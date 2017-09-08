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
        let tdHigh = '';
        let tdLow = '';
        let tdName = '';
        let tdVol = '';
        let tdPercentChange = '';
        let tdActions = '';
        data.forEach((ele) => {
            let range = (ele.lowestAsk - ele.low24hr) / (ele.high24hr - ele.low24hr);
            tdName = '<td>' + ele.marketName + '</a></td>';
            tdLow = '<td class="text-danger">' + numeral(ele.low24hr * 1000).format('0,0.00000') + '</td>';
            tdHigh = '<td class="text-success">' + numeral(ele.high24hr * 1000).format('0,0.00000') + '</td>';
            tdOnePercent = '<td class="text-info">' + numeral(ele.lowestAsk * 1000 * 1.01).format('0,0.00000') + '</td>';
            tdPercentChange = '<td class="text-primary">' + numeral(range).format('0.00%') + '</td>';
            tdActions = '<td><button class="btn btn-success btn-sm" id="buy_' + ele.marketName + '">' +
                'BUY @ ' + ele.lowestAsk + '</button>' + '</td>';
            BTCmarketTable.append('<tr>' + tdName + tdLow + tdHigh + tdOnePercent + tdVol + tdPercentChange + tdActions + '</tr>');
            $('#buy_' + ele.marketName).click(function () {
                let percentage = $('input[name="radioOptions"]:checked').val();
                socket.emit('buy and sell now', {
                    marketName: ele.marketName,
                    percentage: percentage,
                    buy_price: ele.lowestAsk,
                    sell_price: ele.lowestAsk * 1.01
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
        const Graphs = $('#Graphs tbody');
        Graphs.html('');
        data.forEach((current) => {
            // let APPENDTEXT = '';
            // let MACDDIFFTEXT = '';
            // let MACDTEXT = '';
            // let SIGTEXT = '';
            // let HISTTEXT = '';
            // for (let i = current.MACD.length - 6; i < current.MACD.length; i++) {
            //     let MACDnum = parseFloat(current.MACD[i].MACD);
            //     let Signum = parseFloat(current.MACD[i].signal);
            //     let Histnum = parseFloat(current.MACD[i].histogram);
            //
            //     let Diff = ((MACDnum - Signum)/Math.abs(Signum) - 1) * 100;
            //
            //     let positiveMACD = Diff > 0 ? 'text-success' : 'text-danger';
            //     let positiveHIST = Histnum > 0 ? 'text-success' : 'text-danger';
            //
            //     MACDDIFFTEXT += '<span class="' + positiveMACD + '">|' + Diff + '|</span>';
            //     HISTTEXT += '<span class="' + positiveHIST + '">|' + Histnum + '|</span>';
            // }
            //
            // APPENDTEXT = MACDDIFFTEXT + '<br/>' + HISTTEXT;
            let MACDnum = parseFloat(current.MACD[current.MACD.length - 1].MACD);
            let Signum = parseFloat(current.MACD[current.MACD.length - 1].signal);
            let positiveCLASS = MACDnum > 0 && Signum ? 'text-success' : 'text-danger';
            let positiveTEXT = MACDnum > 0 && Signum ? 'ABOVE' : 'BELOW';


            let tdGraph = '<tr>' +
                '<td style="padding: 0 0.75rem"><a href="https://poloniex.com/exchange#' + current.name.toLowerCase() + '" target="_blank">' + current.name + '</td>' +
                '<td style="padding: 0 0.75rem" class="' + positiveCLASS + '">' + positiveTEXT + '</td>' +
                '<td style="padding: 0 0.75rem">' +
                '<div>' +
                '<div style="border-bottom: lightpink solid 1px"><svg id="graph_' + current.name + '" width="' + $(window).width * 0.75 + '" height="60"></svg></div>' +
                '<div><svg id="macd_' + current.name + '" width="' + $(window).width * 0.80 + '" height="60"></svg></div>' +
                '</div>' +
                '</td>' +
                '</tr>';
            Graphs.append(tdGraph);
            let marketChart = new Chart('#graph_' + current.name);
            marketChart.createMarketChart(current.data, 'date', 'close');
            let MACDChart = new Chart('#macd_' + current.name);
            MACDChart.createMACD(current.MACD);
        });
    });

    socket.on('create chart table', () => {

    })
});