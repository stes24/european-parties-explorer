import * as d3 from 'd3'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  const dimensions = {
    width: 800,
    height: 600,
    margin: {
      top: 50,
      right: 20,
      bottom: 30,
      left: 30
    }
  }

  // It draws and can be configured (it is returned again when something changes)
  function scatterPlot (containerDiv) {
    data = data.filter(d => d.year === 2024)

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    const xScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.mds1 - 1.5), d3.max(data, d => d.mds1 + 1.5)])
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.mds2 - 1), d3.max(data, d => d.mds2 + 1)])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    const xAxisContainer = wrapper.append('g')
      .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
    const yAxisContainer = wrapper.append('g')
      .attr('transform', `translate(${dimensions.margin.left}, 0)`)

    xAxisContainer.call(d3.axisBottom(xScale))
    yAxisContainer.call(d3.axisLeft(yScale))

    const bounds = wrapper.append('g')

    const radius = 5

    bounds.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.mds1))
      .attr('cy', d => yScale(d.mds2))
      .attr('r', d => radius)

    console.debug('Finished drawing scatter plot')
  }

  // Update functions - called when something changes, they draw again the views
  scatterPlot.data = function (_) {
    if (!arguments.length) return data
    data = _
    return scatterPlot
  }

  console.debug('Finished creating scatter plot configurable function')
  return scatterPlot
}
