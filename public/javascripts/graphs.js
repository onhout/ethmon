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
    }

    createMarketChart(chartData, x, y) {
        let obj = this;
        let lineFunc = d3.svg.line()
            .x((d) => {
                return obj.xRange(chartData, x)(d[x]);
            })
            .y((d) => {
                return obj.yRange(chartData, y)(d[y]);
            })
            .interpolate('linear');

        obj.vis.append('svg:path')
            .attr('d', lineFunc(chartData))
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
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
                0,
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
            .attr('stroke-dasharray', "3, 3");
    }
}