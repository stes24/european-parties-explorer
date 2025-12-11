import * as d3 from 'd3'
import { attributes, hideTooltip, moveTooltip, showLineChartTooltip, TR_TIME, years } from '@/utils'

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
    margin: { top: 5, right: 25, bottom: 72, left: 30 },
    legendY: 32
  }
  let updateSize

  // Do animation or not
  let doTransition = false

  // Hovering (line chart uses batch hover since lines span multiple years)
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  let onYearChange = _ => {}

  // It draws and can be configured (it is returned again when something changes)
  function lineChart (containerDiv) {
    // Create controls container
    const controlsContainer = containerDiv.append('div')
      .attr('class', 'lineChart-controls')

    // Attributes drop-down menu
    const attrDropDown = controlsContainer.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'lineChartDropDown')
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
    const yearContainer = controlsContainer.append('div')
      .attr('class', 'year-container')
    // Label
    yearContainer.append('span')
      .attr('class', 'year-label')
      .text('YEAR:')
    // Drop-down
    const yearDropDown = yearContainer.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'yearDropDown')
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
      .defined(d => yAccessor(d) != null && !isNaN(yAccessor(d))) // Skip null/undefined/NaN but connect across gaps

    const elementsGroup = wrapper.append('g')
    const gridGroup = wrapper.append('g')

    let brushActive = false
    let parties // Store parties for point hover callback

    // Separate parties with multiple defined values (lines) from single-year parties (points)
    function getPartiesData () {
      parties = d3.group(data, d => d.party_id) // A dictionary -> party id - array of dictionaries (all instances of the party, grouped by the id)
      const multiYear = []
      const singleYear = []

      parties.forEach((values, partyId) => {
        // Count how many defined values this party has for the selected attribute
        const definedValues = values.filter(d => yAccessor(d) != null && !isNaN(yAccessor(d)))
        if (definedValues.length > 1) {
          multiYear.push({ type: 'line', partyId, values }) // id + all instances of the party
        } else if (definedValues.length === 1) {
          singleYear.push({ type: 'circle', data: definedValues[0] }) // Single instance of the party
        }
      })

      return { multiYear, singleYear }
    }

    // Draw lines and points
    function dataJoin () {
      const { multiYear, singleYear } = getPartiesData()

      // Check if any data is brushed
      brushActive = data.some(d => d.brushed)

      // Merge lines and circles into a single array - they are marked with their type
      const allElements = [...multiYear, ...singleYear] // Lines first, then circles

      // Sort by state for proper rendering order
      allElements.sort((a, b) => {
        // Check if a and b are hovered or brushed, regardless of their type
        const isHoveredA = a.type === 'line' ? a.values.some(d => d.hovered) : a.data.hovered
        const isHoveredB = b.type === 'line' ? b.values.some(d => d.hovered) : b.data.hovered
        const isBrushedA = a.type === 'line' ? a.values.some(d => d.brushed) : a.data.brushed
        const isBrushedB = b.type === 'line' ? b.values.some(d => d.brushed) : b.data.brushed

        // First priority: hovered state (hovered on top)
        if (isHoveredA !== isHoveredB) {
          return isHoveredA ? 1 : -1 // 1 = move a after b, -1 = move a before b
        }
        // Second priority: brushed state (brushed above non-brushed)
        if (isBrushedA !== isBrushedB) {
          return isBrushedA ? 1 : -1
        }
        return 0 // If a and b have the same state, they remain in the same order (lines first, then circles)
      })

      // Single data join for both lines and circles
      elementsGroup.selectAll('.line-or-circle-wrapper')
        .data(allElements, d => d.type === 'line' ? `line-${d.partyId}` : `circle-${d.data.party_id}`)
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Unified join functions for both lines and circles
    function enterFn (sel) {
      const groups = sel.append('g')
        .attr('class', 'line-or-circle-wrapper')

      groups.each(function (d) {
        const wrapper = d3.select(this)

        if (d.type === 'line') {
          // Render as line
          wrapper.append('path')
            .attr('class', () => {
              if (d.values.some(v => v.hovered)) return 'line-hovered'
              if (d.values.some(v => v.brushed)) return 'line-brushed'
              if (brushActive) return 'line-deselected'
              return 'line'
            })
            .attr('d', line(d.values))
            .on('mouseenter', (event) => {
              onMouseEnter(d.values)
              showLineChartTooltip(event, d.values)
            })
            .on('mousemove', (event) => moveTooltip(event))
            .on('mouseleave', () => {
              onMouseLeave()
              hideTooltip()
            })
        } else {
          // Render as circle
          wrapper.append('circle')
            .attr('class', () => {
              if (d.data.brushed) return 'circle-brushed'
              if (brushActive) return 'circle-deselected'
              return 'circle'
            })
            .attr('fill', () => {
              if (brushActive && !d.data.brushed) return 'gray'
              return 'steelblue'
            })
            .attr('cx', xScale(xAccessor(d.data)))
            .attr('cy', yScale(yAccessor(d.data)))
            .attr('r', 3)
            .on('mouseenter', (event) => {
              const allInstances = parties.get(d.data.party_id) || [d.data]
              onMouseEnter(allInstances)
              showLineChartTooltip(event, allInstances)
            })
            .on('mousemove', (event) => moveTooltip(event))
            .on('mouseleave', () => {
              onMouseLeave()
              hideTooltip()
            })
        }
      })

      return groups
    }

    function updateFn (sel) {
      sel.each(function (d) {
        const wrapper = d3.select(this)

        if (d.type === 'line') {
          wrapper.select('path')
            .attr('class', () => {
              if (d.values.some(v => v.hovered)) return 'line-hovered'
              if (d.values.some(v => v.brushed)) return 'line-brushed'
              if (brushActive) return 'line-deselected'
              return 'line'
            })
            .transition()
            .duration(doTransition ? TR_TIME : 0)
            .attr('d', line(d.values))
        } else {
          wrapper.select('circle')
            .attr('class', () => {
              if (d.data.brushed) return 'circle-brushed'
              if (brushActive) return 'circle-deselected'
              return 'circle'
            })
            .attr('fill', () => {
              if (d.data.hovered) return 'white'
              if (brushActive && !d.data.brushed) return 'gray'
              return 'steelblue'
            })
            .style('opacity', d.data.hovered ? 1 : null)
            .transition()
            .duration(doTransition ? TR_TIME : 0)
            .attr('cx', xScale(xAccessor(d.data)))
            .attr('cy', yScale(yAccessor(d.data)))
        }
      })

      return sel
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

    // Highlight current year on x-axis
    function highlightCurrentYear () {
      xAxis.selectAll('.tick text')
        .style('fill', d => d === currentYear ? 'red' : null)
        .style('font-weight', d => d === currentYear ? 'bold' : null)
    }
    highlightCurrentYear()

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

    // Update functions
    updateData = function () {
      // Attribute on y axis
      yScale.domain(yDomain(selectedOption))
      yAxis.call(d3.axisLeft(yScale))

      // Adapt grid
      doTransition = false
      gridJoin()

      dataJoin()
      highlightCurrentYear()
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

  // Save the callbacks (batch hover - line chart hovers all instances of a party)
  lineChart.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }
  lineChart.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    console.debug('Line chart received the functions for updating the model on hover')
    return this
  }

  lineChart.bindYearChange = function (callback) {
    onYearChange = callback
    console.debug('Line chart received the function for updating the model on year change')
    return lineChart
  }

  console.debug('Finished creating line chart configurable function')
  return lineChart
}
