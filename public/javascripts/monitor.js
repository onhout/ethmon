// Default web refresh interval (may be changed with web_refresh config option)
let refresh = 5000;

// Default hashrate tolerance (+/- to target hashrate)
let tolerance = 0.05;

// GPU temperature monitoring threshold (zero disables monitoring)
let temperature = 0;

// Title animation index
let animation_index = 0;


// DOM Ready =============================================================

$(document).ready(() => {
    const socket = io();
    let ethPrice = 0;
    let totalMiningHash = 0;
    let predefinedHash = 373;

    socket.emit('get bittrex balance');
    socket.on('bittrex balance', (data) => {
        const BittrexBalance = $('#bittrex_balance tbody');
        const USDTCurrency = $('#USDT_stats ul.list-group');
        const mining_estimator = $('#mining_estimator ul.list-group');
        BittrexBalance.html('');
        USDTCurrency.html('');
        mining_estimator.html('');
        ethPrice = data.currency.ETH;

        data.balances.forEach((balance) => {
            let tdCurrency = '<td>' + balance.Currency + '</td>';
            let tdBalance = '<td>' + balance.Balance + '</td>';
            let tdTotalBTCValue = '<td>' + balance.TotalBTCValue + '</td>';
            let tdRate = '<td>' + balance.LastRate + '</td>';
            let USD = '<td class="text-success">$' + balance.USDValue.toFixed(4) + '</td>';
            BittrexBalance.append('<tr>' + tdCurrency + tdBalance + tdTotalBTCValue + tdRate + USD + '</tr>')
        });

        for (let key in data.currency) {
            if (data.currency.hasOwnProperty(key)) {
                let ele =
                    '<li class="list-group-item list-group-item-dark text-center">' +
                    '<span>' + key + '</span>: ' +
                    '<span class="text-info">$' + data.currency[key].toFixed(2) + '</span>' +
                    '</li>';
                USDTCurrency.append(ele);
            }
        }
        if (data.estimateFigure) {
            let netHashGH = (data.estimateFigure.difficulty / data.estimateFigure.blockTime) / 1e9;
            let userRatio = (totalMiningHash || predefinedHash) * 1e6 / (netHashGH * 1e9);
            let blockPerMin = 60.0 / data.estimateFigure.blockTime;
            let ethPerMin = blockPerMin * 5.0;
            let earningPerMinute = userRatio * ethPerMin;
            let profits = {
                min: earningPerMinute,
                hour: earningPerMinute * 60,
                day: earningPerMinute * 60 * 24,
                week: earningPerMinute * 60 * 24 * 7,
                month: earningPerMinute * 60 * 24 * 30,
                year: earningPerMinute * 60 * 24 * 365
            };

            for (let key in profits) {
                if (profits.hasOwnProperty(key)) {
                    let ele =
                        '<li class="list-group-item list-group-item-dark text-center">' +
                        '<span>' + key + '</span>: ' +
                        '<p>' +
                        '<span class="text-success">' + profits[key].toFixed(6) + 'ETH</span>' +
                        '<span class="text-primary">($' + (profits[key] * data.currency.ETH).toFixed(2) + ')</span>' +
                        '</p>' +
                        '</li>';
                    mining_estimator.append(ele);
                }
            }
        }
    });

    socket.on('incoming', (data) => {
        let eth = [0, 0, 0];
        let sec = [0, 0, 0];


        // Target hashrate tolerance
        if (data[0].tolerance !== undefined) {
            tolerance = data.tolerance / 100;
        }

        // GPU temperature monitoring threshold
        if (data[0].temperature !== undefined) {
            temperature = data.temperature;
        }

        // For each item in JSON, add a table row and cells to the content string
        let warning = {msg: null, last_good: null};
        let error = {msg: null};

        let tableContent = '';

        let restartBtn = $('<td>').append($('<button/>', {
            class: 'btn btn-danger',
            text: 'Restart',
            type: 'button',
            click: function () {
                let pinnumber = $(this).parents('tr').data('pinnumber');
                $(this).prop('disabled', 1);
                socket.emit('restartBtn', pinnumber);
            }
        }));
        $.each(data, (index, miner) => {
            if (miner !== null) {
                let error_class = (miner.error == null) ? '' : ' class=error';
                let span = (data[0].hashrates) ? 8 : 8;

                tableContent += '<tr' + error_class + ' id="' + miner.name + '" data-pinnumber="' + miner.pinnumber + '">';
                tableContent += '<td>' + miner.name + '</td>';
                tableContent += '<td>' + miner.host + '</td>';

                if (miner.warning) {
                    // Only single last good time is reported for now
                    warning.msg = miner.warning;
                    warning.last_good = miner.last_good;
                }
                if (miner.error) {
                    error.msg = miner.error;
                    last_seen = '<br>Last seen: ' + miner.last_seen;
                    tableContent += '<td colspan="' + span + '">' + miner.error + last_seen + '</td>';
                } else if (miner.offline) {
                    tableContent += '<td colspan="' + span + '">' + miner.offline + '</td>';
                } else {
                    tableContent += '<td>' + miner.uptime + '</td>';
                    tableContent += '<td>' + format_stats(miner.eth, eth, miner.target_eth, '<br>') + '</td>';
                    tableContent += '<td>' + format_stats(miner.sec, sec, miner.target_sec, '<br>', !miner.pools.split(';')[1]) + '</td>';
                    if (data[0].hashrates) {
                        tableContent += '<td>' + format_hashrates(miner.eth_hr, '<br>') + '</td>';
                        tableContent += '<td>' + format_hashrates(miner.sec_hr, '<br>', !miner.pools.split(';')[1]) + '</td>';
                    }
                    tableContent += '<td>' + format_temps(miner.temps, '<br>', miner.ti) + '</td>';
                    tableContent += '<td>' + format_pools(miner.pools, '<br>') + '</td>';
                    tableContent += '<td>' + miner.ver + '</td>';
                }
                tableContent += '<td>' + miner.comments + '</td>';
                tableContent += '</tr>';
            }
        });
        let jqueryTable = $(tableContent).find('td').parents('tr').append(restartBtn);


        // Inject the whole content string into existing HTML table
        $('#minerInfo table tbody').html(jqueryTable);

        // Update window title and header with hashrate substitution
        let title = data[0].title.replace('%HR%', Number(eth[0] / 1000).toFixed(2));
        totalMiningHash = Number(eth[0] / 1000).toFixed(2);
        if (error.msg !== null) {
            title = 'Error: ' + title;
        } else if (warning.msg !== null) {
            title = 'Warning: ' + title;
        }
        if (data[0].animation) {
            let c = data[0].animation[animation_index];
            animation_index = (animation_index + 1) % data[0].animation.length;
            title = title.replace('%ANI%', c);
        }
        if ($('title').html() !== title) {
            $('title').html(title);
        }

        let header = data[0].header.replace('%HR%', Number(eth[0] / 1000).toFixed(0));

        if ($('#minerInfo h1').html() !== title) {
            $('#minerInfo h1').html(title);
        }

        // Update summary
        let summaryContent = '';
        summaryContent += 'Total ETH/ETC hashrate: ' + format_stats(eth.join(';'), null, null, ', ') + '<br>';
        summaryContent += 'Total Secondary hashrate: ' + format_stats(sec.join(';'), null, null, ', ');
        $('#minerSummary').html(summaryContent);

        // Display last update date/time and warning message
        let lastUpdated = 'Last updated: ' + data[0].updated +
            ((warning.msg !== null) ? ('<br><span class="error">' + warning.msg + ', last seen good: ' + warning.last_good + '</span>') : '');
        $('#lastUpdated').html(lastUpdated).removeClass("error");

        // Update refresh interval if defined
        if (data[0].refresh !== undefined) {
            refresh = data.refresh;
        }
    });
});

// Functions =============================================================

function format_stats(stats, currency, target, splitter, skip) {
    if (!skip && stats) {
        if (!splitter) {
            splitter = '';
        }

        let s = stats.split(';');

        // Update totals
        if (currency != null) {
            currency[0] += Number(s[0]);
            currency[1] += Number(s[1]);
            currency[2] += Number(s[2]);
        }

        // Format fields
        let hashrate = Number(s[0] / 1000).toFixed(2) + '&nbsp;MH/s';
        let shares = s[1] + '/' + s[2];
        let rejects = (s[1] > 0) ? ('&nbsp;(' + Number(s[2] / s[1] * 100).toFixed(2) + '%)') : '';

        // Check tolerance
        if ((target !== null) && tolerance) {
            if (s[0] / 1000 < target * (1 - tolerance)) {
                hashrate = '<span class="error">' + hashrate + '</span>';
            } else if (s[0] / 1000 > target * (1 + tolerance)) {
                hashrate = '<span class="warning">' + hashrate + '</span>';
            }
        }

        return hashrate + splitter + shares + rejects;
    }
    return '';
}

function format_temps(temps, splitter, ti) {
    if (!splitter) {
        splitter = ' ';
    }
    let tf = '';
    if (temps) {
        let t = temps.split(';');
        let tnum = ti ? ti.length : (t.length / 2);
        for (let i = 0; i < tnum; ++i) {
            let j = (ti ? ti[i] : i) * 2;
            let temp = t[j] + 'C';
            let fan = t[j + 1] + '%';
            if (temperature && (t[j] > temperature)) {
                temp = '<span class="error">' + temp + '</span>';
            }
            tf += ((i > 0) ? splitter : '') + temp + ':' + fan;
        }
    }
    return tf;
}

function format_hashrates(hr, splitter, skip) {
    if (!splitter) {
        splitter = ' ';
    }
    let hashrates = '';
    if (!skip && hr) {
        let h = hr.split(';');
        for (let i = 0; i < h.length; ++i) {
            hashrates += ((i > 0) ? splitter : '') + (Number(h[i] / 1000).toFixed(2) + '&nbsp;MH/s');
        }
    }
    return hashrates;
}

function format_pools(pools, splitter) {
    if (!splitter) {
        splitter = '; ';
    }
    return pools.split(';').join(splitter);
}
