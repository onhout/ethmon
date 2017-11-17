class Chart {
    constructor(target_location) {
        this.vis = d3.select(target_location);
        let WIDTH = $(target_location).width(),
            HEIGHT = $(target_location).height();

        this.HEIGHT = HEIGHT;
        this.WIDTH = WIDTH;

        this.xRange = (chartData, XDATA) => {
            return d3
                .scale
                .linear()
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
                    chartData.length - 1
                ]);
        }

        this.yScale = (chartData) => {
            return d3
                .scale
                .linear()
                .range([0, HEIGHT])
                .domain([
                    d3.min(chartData, (d) => {
                        return d;
                    }),
                    d3.max(chartData, (d) => {
                        return d;
                    })]);
        }
    }

    createMarketChart(chartData, sma, ema, x, y) {
        let obj = this;

        let smaline = d3.svg.line()
            .x((d, i) => {
                return obj.xScale(sma, 0)(i);
            })
            .y((d) => {
                return obj.yScale(sma)(d);
            })
            .interpolate('linear');

        let emaline = d3.svg.line()
            .x((d, i) => {
                return obj.xScale(ema, 0)(i);
            })
            .y((d) => {
                return obj.yScale(ema)(d);
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

        obj.vis.append('svg:path')
            .attr('d', smaline(sma))
            .attr('stroke', 'red')
            .attr('stroke-width', 1)
            .attr('fill', 'none');

        obj.vis.append('svg:path')
            .attr('d', emaline(ema))
            .attr('stroke', 'green')
            .attr('stroke-width', 1)
            .attr('fill', 'none');

        obj.vis.append('svg:path')
            .attr('d', lineFunc(chartData))
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 3)
            .attr('fill', 'none');
    }

    createMACD(data) {
        let obj = this;

        //   Baseline
        obj.vis.append("line")
            .attr("x1", 0)
            .attr("y1", obj.HEIGHT / 2)
            .attr("x2", obj.WIDTH)
            .attr("y2", obj.HEIGHT / 2)
            .attr('class', 'baseline');
// Top clip

        obj.vis.append("clipPath")
            .attr("id", "clipPathPos")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", obj.WIDTH)
            .attr("height", obj.HEIGHT / 2);

        obj.vis.append("clipPath")
            .attr("id", "clipPathNeg")
            .append("rect")
            .attr("x", 0)
            .attr("y", obj.HEIGHT / 2)
            .attr("width", obj.WIDTH)
            .attr("height", obj.HEIGHT / 2);

//   data points

        let xScale = d3.scale.linear()
            .range([0, obj.WIDTH])
            .domain([
                -25,
                data.length - 1
            ]);

        let yScale = d3.scale.linear()
            .range([0, obj.HEIGHT])
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