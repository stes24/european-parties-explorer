import * as d3 from 'd3'
import { years } from '@/utils'

export default function () {
  let data = []

  // Which attributes to use
  const xAccessor = d => d.year
  const yAccessor = d => d.eu_position

  const dimensions = {
    width: 800,
    height: 350,
    margin: { top: 35, right: 25, bottom: 40, left: 35 }
  }
  let updateSize

  function lineChart (containerDiv) {
    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    // How to generate the lines
    const line = d3.line()
      .x(d => xScale(xAccessor(d)))
      .y(d => yScale(yAccessor(d)))
      .defined(d => yAccessor(d) !== null) // Correctly draw lines starting from a later year

    // Draw axes
    const xAxis = wrapper.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .ticks(7)
        .tickValues(years))
    const yAxis = wrapper.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${dimensions.margin.left}, 0)`)
      .call(d3.axisLeft(yScale))
      .call(gPaths => gPaths.selectAll('.axis line').clone() // Long horizontal lines
        .attr('x2', dimensions.width - dimensions.margin.left - dimensions.margin.right)
        .style('stroke', '#AAAAAA')
        .style('stroke-width', '1px')
        .style('stroke-opacity', 0.3)
        .lower())

    console.debug('Finished drawing line chart')
  }

  lineChart.data = function (_) {
    if (!arguments.length) return lineChart
    data = _
    return lineChart
  }
  lineChart.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return lineChart
  }

  console.debug('Finished creating line chart configurable function')
  return lineChart
}
