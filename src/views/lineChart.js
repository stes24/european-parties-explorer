import * as d3 from 'd3'
import { attributes, TR_TIME, years } from '@/utils'

// const RADIUS = 4

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData
  let currentYear

  // Which attributes to use
  let selectedOption = 'vote'
  const xAccessor = d => d.year
  const yAccessor = d => d[selectedOption]

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 35, right: 25, bottom: 40, left: 30, topDropDown: 8, leftDropDown: 10, rightYear: 12 },
    legendY: 32
  }
  let updateSize

  // Do animation or not
  let doTransition = false

  let onYearChange = _ => {}

  // It draws and can be configured (it is returned again when something changes)
  function lineChart (containerDiv) {
    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const yDomain = function (selectedOption) {
      if (selectedOption === 'vote' || selectedOption === 'seat' || selectedOption === 'epvote') {
        return [0, d3.max(data, yAccessor)]
      } else if (selectedOption === 'lrgen' || selectedOption === 'lrecon') {
        return [-5, 5]
      } else {
        return [0, 10]
      }
    }
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain(yDomain(selectedOption))
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

    // Join functions
    function enterFn (sel) {
      return sel.append('path')
        .attr('class', 'line')
        .attr('d', ([partyId, values]) => line(values))
    }
    function updateFn (sel) {
      return sel.call(update => update
        .transition()
        .duration(doTransition ? TR_TIME : 0)
        .attr('d', ([partyId, values]) => line(values))
      )
    }
    function exitFn (sel) {
      sel.call(exit => exit.remove())
    }

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

    // Draw axis legend
    const xLegend = wrapper.append('text')
      .attr('class', 'legend')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.legendY)
      .attr('text-anchor', 'middle')
      .text('Year')

    // Long horizontal lines
    function gridJoin () {
      gridGroup.selectAll('line')
        .data(yScale.ticks())
        .join(enterFnGrid, updateFnGrid, exitFnGrid)
    }
    gridJoin()

    // Grid join functions
    function enterFnGrid (sel) {
      return sel.append('line')
        .attr('class', 'grid')
        .attr('x1', dimensions.margin.left)
        .attr('x2', dimensions.width - dimensions.margin.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
    }
    function updateFnGrid (sel) {
      return sel.call(update => update
        .transition()
        .duration(doTransition ? TR_TIME : 0)
        .attr('x1', dimensions.margin.left)
        .attr('x2', dimensions.width - dimensions.margin.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
      )
    }
    function exitFnGrid (sel) {
      sel.call(exit => exit.remove())
    }

    // Attributes drop-down menu
    const attrDropDown = containerDiv.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'lineChartDropDown')
      .style('top', `${containerDiv.node().getBoundingClientRect().top + dimensions.margin.topDropDown}px`)
      .style('left', `${containerDiv.node().getBoundingClientRect().left + dimensions.margin.leftDropDown}px`)
    attrDropDown.selectAll('option')
      .data(Object.keys(attributes).filter(a => attributes[a].goesOnLineChart))
      .enter()
      .append('option')
      .attr('value', d => d)
      .text(d => attributes[d].name)
    attrDropDown.on('change', (event) => {
      selectedOption = event.target.value
      updateData()
    })

    // Create container for year label + drop-down
    const yearContainer = containerDiv.append('div')
      .attr('class', 'text-row')
      .style('top', `${containerDiv.node().getBoundingClientRect().top + dimensions.margin.topDropDown - 2}px`)
      .style('right', `${dimensions.margin.rightYear}px`)
    // Label
    yearContainer.append('span')
      .attr('class', 'label')
      .text('YEAR:')
    // Drop-down
    const yearDropDown = yearContainer.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'yearDropDown')
      .style('position', 'static')
      .style('font-size', '16px')
    yearDropDown.selectAll('option')
      .data(years.reverse())
      .enter()
      .append('option')
      .attr('value', d => d)
      .text(d => d)
    yearDropDown.on('change', (event) => {
      onYearChange(+event.target.value)
    })

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

    // Update functions
    updateData = function () {
      // Attribute on y axis
      yScale.domain(yDomain(selectedOption))
      yAxis.call(d3.axisLeft(yScale))

      // Adapt grid
      doTransition = false
      gridJoin()

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
      xLegend.transition(trans)
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.legendY)
      attrDropDown.style('top', `${containerDiv.node().getBoundingClientRect().top + dimensions.margin.topDropDown}px`)
        .style('left', `${containerDiv.node().getBoundingClientRect().left + dimensions.margin.leftDropDown}px`)

      doTransition = true
      gridJoin()

      dataJoin()
    }

    console.debug('Finished drawing line chart')
  }

  lineChart.year = function (_) {
    if (!arguments.length) return currentYear
    currentYear = _
    return lineChart
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

  lineChart.bindYearChange = function (callback) {
    onYearChange = callback
    console.debug('Line chart received the function for updating the model on year change')
    return lineChart
  }

  console.debug('Finished creating line chart configurable function')
  return lineChart
}
