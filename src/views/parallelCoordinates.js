import * as d3 from 'd3'
import { attributes, countries, factions, hideTooltip, moveTooltip, showTooltip, TR_TIME } from '@/utils'
import boxPlot from './boxPlot'

const LEGEND_ROTATION = -13

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData
  let currentYear

  // How to access the data for each dimension
  const xAccessor = attr => attr
  const yAccessors = {}

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 50, right: 75, bottom: 70, left: 125 },
    legend: { x: 10, y: 18 },
    brush: { top: -1, right: 10, bottom: 1, left: -10 }
  }
  let updateSize

  // Do animation or not
  let doTransition = false

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // Box plots hovering
  let onBoxPlotMouseEnter = _ => {}
  let onBoxPlotMouseLeave = _ => {}

  // Brushing
  let onBrush = _ => {}
  const brushes = {}
  let brushActive = false

  // It draws and can be configured (it is returned again when something changes)
  function parallelCoordinates (containerDiv) {
    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    let attributeIds
    let xScale, yScales

    function computeAttributes () {
      attributeIds = Object.keys(attributes)
        .filter(a => attributes[a].goesOnParallelCoordinates && currentYear >= attributes[a].minYear)

      // Scales
      xScale = d3.scalePoint()
        .domain(attributeIds.map(xAccessor))
        .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      // Define more y scales, one for each attribute
      const scaleRange = [dimensions.height - dimensions.margin.bottom, dimensions.margin.top]
      yScales = {} // Will be a map - key (attribute id) -> value (scale associated to that attribute)
      attributeIds.forEach(attr => {
        if (attr === 'family') {
          yScales[attr] = d3.scalePoint()
            .domain(Object.keys(factions).map(Number))
            .range(scaleRange)
        } else if (attr === 'country') {
          yScales[attr] = d3.scalePoint()
            .domain([13, 1, 6, 3, 10, // West
              2, 22, 14, 7, 24, 25, 16, 11, // North
              31, 40, 4, 8, 12, 29, 5, // South
              20, 21, 23, 26, 27, 28].reverse()) // East
            .range(scaleRange)
        } else if (attr === 'region') {
          yScales[attr] = d3.scalePoint()
            .domain(['West', 'North', 'South', 'East'].reverse())
            .range(scaleRange)
        } else if (attr === 'lrgen' || attr === 'lrecon') {
          yScales[attr] = d3.scaleLinear()
            .domain([-5, 5])
            .range(scaleRange)
        } else {
          yScales[attr] = d3.scaleLinear()
            .domain([0, 10])
            .range(scaleRange)
        }
        yAccessors[attr] = d => d[attr] // Accessor for the specific attribute
      })
    }
    computeAttributes()

    // How to generate the lines
    const line = d3.line() // d is given as [attribute name, attribute value for the given party]
      .x(([attr, val]) => xScale(xAccessor(attr))) // Place on the correct scale using the attribute name
      .y(([attr, val]) => yScales[attr](val)) // Find right scale with attribute, then pass the value to it

    const linesGroup = wrapper.append('g')
    const axesGroup = wrapper.append('g')
    const boxPlotsGroup = wrapper.append('g')

    // Store box plots
    const boxPlotInstances = {}

    // Draw lines
    function dataJoin () {
      brushActive = data.some(d => d.brushed)

      linesGroup.selectAll('path')
        .data(data.sort((a, b) => {
          // First priority: hovered state (hovered on top)
          if (a.hovered !== b.hovered) {
            return a.hovered ? 1 : -1
          }
          // Second priority: brushed state (brushed above non-brushed)
          if (a.brushed !== b.brushed) {
            return a.brushed ? 1 : -1
          }
          // No third priority needed for lines (they don't have size)
          return 0
        }), d => d.party_id)
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Join functions
    function enterFn (sel) {
      return sel.append('path')
        .attr('class', d => {
          if (d.hovered) return 'line-hovered'
          if (d.brushed) return 'line-brushed'
          if (brushActive) return 'line-deselected'
          return 'line'
        })
        .attr('d', d => line(attributeIds.map(attr => [attr, yAccessors[attr](d)])))
        .on('mouseenter', (event, d) => {
          onMouseEnter(d)
          showTooltip(event, d)
        })
        .on('mousemove', (event) => moveTooltip(event))
        .on('mouseleave', (event, d) => {
          onMouseLeave(d)
          hideTooltip()
        })
    }
    function updateFn (sel) {
      return sel.call(update => update
        .attr('class', d => {
          if (d.hovered) return 'line-hovered'
          if (d.brushed) return 'line-brushed'
          if (brushActive) return 'line-deselected'
          return 'line'
        })
        .transition()
        .duration(doTransition ? TR_TIME : 0)
        .attr('d', d => line(attributeIds.map(attr => [attr, yAccessors[attr](d)])))
      )
    }
    function exitFn (sel) {
      sel.call(exit => exit.remove())
    }

    // Single axis operations
    function makeAxis (attr) {
      const axis = d3.axisLeft(yScales[attr])
      if (attr === 'family') axis.tickFormat(id => factions[id].name)
      if (attr === 'country') axis.tickFormat(id => countries[id])
      return axis
    }
    function legendHover (sel) {
      sel.on('mouseenter', (event, d) => showTooltip(event, d))
        .on('mousemove', (event) => moveTooltip(event))
        .on('mouseleave', () => hideTooltip())
    }
    // Helper function to set up brush for an axis, needed because there are different axes in each year
    function setupBrush (axis, attr) {
      // Remove old brush if it exists
      axis.selectAll('.brush').remove()

      // Create new brush
      axis.call(d3.brushY()
        .filter(event => event.target.tagName !== 'text') // Avoids the very bad bug
        .extent([[dimensions.brush.left, yScales[attr].range()[1] + dimensions.brush.top],
          [dimensions.brush.right, yScales[attr].range()[0] + dimensions.brush.bottom]])
        .on('brush', (event) => {
          updateBrush(attr, event.selection)
        })
        .on('end', (event) => {
          if (!event.selection) clearBrush(attr)
        })
      )
    }
    function updateBrush (attr, sel) {
      // Retrieve single brush on axis
      const [y0, y1] = sel
      brushes[attr] = new Set(
        data.filter(d => {
          const y = yScales[attr](yAccessors[attr](d))
          return y0 <= y && y <= y1
        }).map(d => d.party_id)
      )
      // Intersect all brushes
      onBrush(intersect(Object.values(brushes)), 'parallelCoordinates')
    }
    function clearBrush (attr) {
      brushes[attr] = null
      onBrush(intersect(Object.values(brushes)), 'parallelCoordinates')
    }
    function intersect (sets) {
      const active = sets.filter(s => s !== null) // Non null brushes (active brushes)
      if (active.length === 0) return null
      return active.reduce((acc, s) => new Set([...acc].filter(x => s.has(x)))) // Accumulated set intersection current set
    }

    // Draw axes and box plots
    function axesJoin () {
      axesGroup.selectAll('.axis')
        .data(attributeIds)
        .join(enterFnAxes, updateFnAxes, exitFnAxes)
      drawBoxPlots()
    }
    axesJoin()

    // Axes join functions
    function enterFnAxes (sel) {
      return sel.append('g')
        .attr('class', 'axis')
        .attr('transform', attr => `translate(${xScale(xAccessor(attr))}, 0)`) // Each attribute positions the corresponding axis
        .each(function (attr) {
          const axis = d3.select(this)
          axis.call(makeAxis(attr))

          // Legend operations
          axis.append('text')
            .attr('class', 'legend')
            .attr('transform', `rotate(${LEGEND_ROTATION})`)
            .attr('x', dimensions.legend.x)
            .attr('y', dimensions.margin.top - dimensions.legend.y)
            .attr('text-anchor', 'middle')
            .text(attributes[attr].name)
            .call(legendHover)

          if (attr === 'family') {
            axis.selectAll('.tick text').style('fill', d => factions[d].color)
          }

          // Brush
          setupBrush(axis, attr)
        })
    }
    function updateFnAxes (sel) {
      return sel.call(update => update
        .each(function (attr) {
          const axis = d3.select(this)

          axis.transition()
            .duration(doTransition ? TR_TIME : 0)
            .attr('transform', `translate(${xScale(xAccessor(attr))},0)`)
            .call(makeAxis(attr))

          // Update legend
          axis.select('.legend')
            .text(attributes[attr].name)
            .call(legendHover)

          // Update brush with new scales
          setupBrush(axis, attr)
        })
      )
    }
    function exitFnAxes (sel) {
      sel.call(exit => exit.remove())
    }

    function drawBoxPlots () {
      const boxPlotWidth = 15
      const boxPlotHeight = dimensions.margin.bottom

      // Exclude categorical attributes
      const numericAttributes = attributeIds.filter(attr => attr !== 'country' && attr !== 'family' && attr !== 'region')

      // Manage box plot containers
      boxPlotsGroup.selectAll('g.boxPlot')
        .data(numericAttributes, d => d)
        .join(
          enter => { // Place box plot containers and set parameters for each box plot
            return enter.append('g')
              .attr('class', 'boxPlot')
              .attr('transform', attr => `translate(${xScale(attr) - boxPlotWidth / 2}, ${dimensions.height - dimensions.margin.bottom})`)
              .each(function (attr) {
                // Create new box plot for this attribute
                const bp = boxPlot()
                boxPlotInstances[attr] = bp
                // Bind hover callbacks (box plots hover many parties at once)
                bp.bindMouseEnter(onBoxPlotMouseEnter)
                  .bindMouseLeave(onBoxPlotMouseLeave)
                // Set parameters and call drawing function
                bp.size(boxPlotWidth, boxPlotHeight)
                  .data(data)
                  .attribute(attr)
                d3.select(this).call(bp)
              })
          },
          update => {
            return update
              .transition()
              .duration(doTransition ? TR_TIME : 0)
              .attr('transform', attr => `translate(${xScale(attr) - boxPlotWidth / 2}, ${dimensions.height - dimensions.margin.bottom})`)
              .each(function (attr) {
                // Update the existing box plot instance
                const bp = boxPlotInstances[attr]
                if (bp) {
                  bp.size(boxPlotWidth, boxPlotHeight)
                    .data(data)
                    .attribute(attr)
                }
              })
          },
          exit => {
            return exit.each(function (attr) {
              delete boxPlotInstances[attr]
            }).remove()
          }
        )
    }

    // Update functions
    updateData = function () {
      // Recompute which axes are needed for the selected year
      computeAttributes()
      doTransition = false
      axesJoin()

      dataJoin()
    }

    updateSize = function () {
      wrapper.attr('width', dimensions.width).attr('height', dimensions.height)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      attributeIds.forEach(attr => yScales[attr].range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top]))

      doTransition = true
      axesJoin()

      dataJoin()
    }

    console.debug('Finished drawing parallel coordinates')
  }

  parallelCoordinates.year = function (_) {
    if (!arguments.length) return currentYear
    currentYear = _
    return parallelCoordinates
  }
  parallelCoordinates.data = function (_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return parallelCoordinates
  }
  parallelCoordinates.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return parallelCoordinates
  }

  // Save the callbacks (update appropriate properties in the data)
  parallelCoordinates.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }
  parallelCoordinates.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    console.debug('Parallel coordinates received the functions for updating the model on hover')
    return this
  }
  parallelCoordinates.bindBrush = function (callback) {
    onBrush = callback
    console.debug('Parallel coordinates received the functions for updating the model on brush')
    return this
  }

  // Save the box plot callbacks
  parallelCoordinates.bindBoxPlotMouseEnter = function (callback) {
    onBoxPlotMouseEnter = callback
    return this
  }
  parallelCoordinates.bindBoxPlotMouseLeave = function (callback) {
    onBoxPlotMouseLeave = callback
    console.debug('Parallel coordinates received the functions for updating the model on box plot hover')
    return this
  }

  console.debug('Finished creating parallel coordinates configurable function')
  return parallelCoordinates
}
