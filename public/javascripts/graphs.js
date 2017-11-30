class Chart {
    constructor(target_location) {
        let margin = {top: 0, right: 0, bottom: 60, left: 70};

        let WIDTH = $(target_location).width() - margin.left - margin.right,
            HEIGHT = $(target_location).height() - margin.top - margin.bottom,
            ORGWIDTH = $(target_location).width(),
            ORGHEIGHT = $(target_location).height();

        if (target_location.indexOf('#macd_') == 0) {
            this.vis = d3.select(target_location)
        } else {
            this.vis = d3.select(target_location).append("svg")
                .attr("width", WIDTH + margin.left + margin.right)
                .attr("height", HEIGHT + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        }


        this.HEIGHT = HEIGHT;
        this.WIDTH = WIDTH;
        this.ORGHEIGHT = ORGHEIGHT;
        this.ORGWIDTH = ORGWIDTH;

        this.xRange = (chartData, XDATA) => {
            return d3
                .time
                .scale()
                .range([0, WIDTH])
                .domain([
                    d3.min(chartData, (d) => {
                        return d[XDATA];
                    }),
                    d3.max(chartData, (d) => {
                        return d[XDATA];
                    })]);
        }
        this.yRange = (chartData, YDATA) => {
            return d3
                .scale
                .linear()
                .range([HEIGHT, 0])
                .domain([
                    d3.min(chartData, (d) => {
                        return d[YDATA];
                    }),
                    d3.max(chartData, (d) => {
                        return d[YDATA];
                    })]);
        }

        this.xScale = (chartData, xDomain) => {
            return d3
                .scale
                .linear()
                .range([0, WIDTH])
                .domain([
                    xDomain,
                    chartData.length
                ]);
        }

        this.yScale = (chartData) => {
            return d3
                .scale
                .linear()
                .range([HEIGHT, 0]);
        }
    }

    createMarketChart(chartData, sma, ema, x, y) {
        let obj = this;
        let xAxis = d3.svg.axis()
            .scale(obj.xRange(chartData, x))
            .tickFormat(function (d) {
                return d3.time.format('%m/%e %H:%M')(new Date(d * 1000));
            })
            .orient("bottom");

        let yAxis = d3.svg.axis()
            .scale(obj.yRange(chartData, y))
            .tickFormat(d => d3.format(".4f")(d * 1000))
            .innerTickSize(-obj.WIDTH)
            .outerTickSize(0)
            .tickPadding(10)
            .orient("left");


        // let xAxis = d3.scale.linear().range([0, obj.WIDTH]);
        // let yAxis = d3.svg.axis().scale(obj.yRange(chartData, x), x)
        //     .orient("left").ticksize(5);

        let smaline = d3.svg.line()
            .x((d, i) => {
                return obj.xScale(sma, sma.length - chartData.length)(i);
            })
            .y((d) => {
                return obj.yScale(sma).domain([
                    d3.min(chartData, (d) => {
                        return d[y];
                    }),
                    d3.max(chartData, (d) => {
                        return d[y];
                    })])(d);
            })
            .interpolate('linear');

        let emaline = d3.svg.line()
            .x((d, i) => {
                return obj.xScale(ema, ema.length - chartData.length)(i);
            })
            .y((d) => {
                return obj.yScale(ema).domain([
                    d3.min(chartData, (d) => {
                        return d[y];
                    }),
                    d3.max(chartData, (d) => {
                        return d[y];
                    })])(d);
            })
            .interpolate('linear');


        let lineFunc = d3.svg.line()
            .x((d, i) => {
                return obj.xRange(chartData, x)(d[x]);
            })
            .y((d) => {
                return obj.yRange(chartData, y)(d[y]);
            })
            .interpolate('linear');

        obj.vis.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + obj.HEIGHT + ")")
            .attr("stroke", "white")
            .attr('stroke-width', 1)
            .attr('fill', 'none')
            .call(xAxis)
            .selectAll("text")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-25)")
            .style("text-anchor", "end");

        obj.vis.append("svg:g")
            .attr("class", "y axis")
            .attr("stroke", "white")
            .attr('stroke-width', 1)
            .attr('fill', 'none')
            .call(yAxis);

        obj.vis.append('svg:path')
            .attr('d', lineFunc(chartData))
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 3)
            .attr('fill', 'none');

        obj.vis.append('svg:path')
            .attr('d', smaline(sma))
            .attr('stroke', 'red')
            .attr('stroke-width', 1)
            .attr('fill', 'none');

        obj.vis.append('svg:path')
            .attr('d', emaline(ema))
            .attr('stroke', 'yellow')
            .attr('stroke-width', 1)
            .attr('fill', 'none');


    }

    createMACD(data, chartData) {
        let obj = this;

        //   Baseline
        obj.vis.append("line")
            .attr("x1", 0)
            .attr("y1", obj.ORGHEIGHT / 2)
            .attr("x2", obj.ORGWIDTH)
            .attr("y2", obj.ORGHEIGHT / 2)
            .attr('class', 'baseline');
// Top clip

        obj.vis.append("clipPath")
            .attr("id", "clipPathPos")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", obj.ORGWIDTH)
            .attr("height", obj.ORGHEIGHT / 2);

        obj.vis.append("clipPath")
            .attr("id", "clipPathNeg")
            .append("rect")
            .attr("x", 0)
            .attr("y", obj.ORGHEIGHT / 2)
            .attr("width", obj.ORGWIDTH)
            .attr("height", obj.ORGHEIGHT / 2);

//   data points

        let xScale = d3.scale.linear()
            .range([0, obj.ORGWIDTH])
            .domain([
                data.length - chartData.length,
                data.length
            ]);

        let yScale = d3.scale.linear()
            .range([0, obj.ORGHEIGHT])
            .domain([
                d3.max(data, function (d) {
                    return Math.abs(d.histogram) || 0;
                }),
                d3.max(data, function (d) {
                    return Math.abs(d.histogram) || 0;
                }) * (-1)
            ]);

        let line = d3.svg.line()
            .x((d, i) => {
                return xScale(i);
            })
            .y((d) => {
                return yScale(d.histogram || 0);
            });

        let dataArea = obj.vis.append('g')
            .attr("class", "dataArea");

        dataArea.append("path")
            .attr("d", line(data))
            .attr('class', 'positive')
            .attr("clip-path", "url(#clipPathPos)");

        dataArea.append("path")
            .attr("d", line(data))
            .attr('class', 'negative')
            .attr("clip-path", "url(#clipPathNeg)")
            .attr('stroke-dasharray', "2, 2");
    }
}