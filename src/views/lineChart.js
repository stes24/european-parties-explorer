import * as d3 from 'd3'
import { years, TR_TIME } from '@/utils'

const RADIUS = 4

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData

  // Which attributes to use
  const xAccessor = d => d.year
  const yAccessor = d => d.eu_position // TEMPORARY

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 35, right: 25, bottom: 40, left: 25 }
  }
  let updateSize

  // It draws and can be configured (it is returned again when something changes)
  function lineChart (containerDiv) {
    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([0, 10]) // TEMPORARY
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    // How to generate the lines
    const line = d3.line()
      .x(d => xScale(xAccessor(d)))
      .y(d => yScale(yAccessor(d)))
      // .defined(d => yAccessor(d) !== null) // Correctly draw lines starting from a later year

    const linesGroup = wrapper.append('g')
    const gridGroup = wrapper.append('g')
    const parties = d3.group(data, d => d.party_id) // INSIDE JOIN? A dictionary -> party id - array of dictionaries (all instances of the party, grouped by the id)

    // Draw lines
    function dataJoin () {
      linesGroup.selectAll('path')
        .data(parties)
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Draw axes
    const xAxis = wrapper.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .ticks(years.length)
        .tickValues(years))
    const yAxis = wrapper.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${dimensions.margin.left}, 0)`)
      .call(d3.axisLeft(yScale))

    // Long horizontal lines
    const grid = gridGroup.selectAll('line')
      .data(yScale.ticks(10))
      .enter()
      .append('line')
      .attr('class', 'grid')
      .attr('x1', dimensions.margin.left)
      .attr('x2', dimensions.width - dimensions.margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))

    // Group the data (one line = one party over the years), give each party to one line
    /* parties.forEach((party, partyId) => {
      if (party.length > 1) { // Party with at least two years -> a line
        linesGroup.append('path')
          .attr('class', 'line')
          .attr('d', line(party))
      } else { // Party with only one year -> a point
        const d = party[0]
        linesGroup.append('circle')
          .attr('class', 'point')
          .attr('cx', xScale(xAccessor(d)))
          .attr('cy', yScale(yAccessor(d)))
          .attr('r', RADIUS)
          .attr('fill', 'steelblue')
      }
    }) */

    // Join functions
    function enterFn (sel) {
      return sel.append('path')
        .attr('class', 'line')
        .attr('d', d => line(d[1]))
    }
    function updateFn (sel) {
      return sel.call(update => update
        .transition()
        .duration(TR_TIME)
        .attr('d', d => line(d[1]))
      )
    }
    function exitFn (sel) {
      sel.call(exit => exit
        .transition()
        .duration(TR_TIME)
        .remove()
      )
    }

    // Update functions
    updateData = function () {
      dataJoin()
    }

    updateSize = function () {
      const trans = d3.transition().duration(TR_TIME)

      wrapper.attr('width', dimensions.width).attr('height', dimensions.height)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      yScale.range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

      xAxis.transition(trans)
        .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
        .call(d3.axisBottom(xScale)
          .ticks(years.length)
          .tickValues(years))
      yAxis.transition(trans)
        .call(d3.axisLeft(yScale))
      grid.transition(trans)
        .attr('x1', dimensions.margin.left)
        .attr('x2', dimensions.width - dimensions.margin.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))

      dataJoin()
    }

    console.debug('Finished drawing line chart')
  }

  lineChart.data = function (_) {
    if (!arguments.length) return lineChart
    data = _
    if (typeof updateData === 'function') updateData()
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
