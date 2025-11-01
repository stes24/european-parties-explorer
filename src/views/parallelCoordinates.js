import * as d3 from 'd3'
import { attributes, countries, factions, hideTooltip, moveTooltip, showTooltip, TR_TIME } from '@/utils'

const LEGEND_ROTATION = -13

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData

  // How to access the data for each dimension
  const xAccessor = attr => attr
  const yAccessors = {}

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 50, right: 60, bottom: 15, left: 125 },
    legend: { x: 10, y: 18 }
  }
  let updateSize

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // It draws and can be configured (it is returned again when something changes)
  function parallelCoordinates (containerDiv) {
    const attributeIds = Object.keys(attributes)

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scalePoint()
      .domain(attributeIds.map(xAccessor))
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    // Define more y scales, one for each attribute
    const scaleRange = [dimensions.height - dimensions.margin.bottom, dimensions.margin.top]
    const yScales = {} // Will be a map - key (attribute id) -> value (scale associated to that attribute)
    attributeIds.forEach(attr => {
      if (attr === 'country') {
        yScales[attr] = d3.scalePoint()
          .domain(Object.keys(countries).map(Number))
          .range(scaleRange)
      } else if (attr === 'family') {
        yScales[attr] = d3.scalePoint()
          .domain(Object.keys(factions).map(Number))
          .range(scaleRange)
      } else {
        yScales[attr] = d3.scaleLinear()
          .domain([0, 10])
          .range(scaleRange)
      }
      yAccessors[attr] = d => d[attr] // Accessor for the specific attribute
    })

    // How to generate the lines
    const line = d3.line() // d is given as [attribute name, attribute value for the given party]
      .x(([attr, val]) => xScale(xAccessor(attr))) // Place on the correct scale using the attribute name
      .y(([attr, val]) => yScales[attr](val)) // Find right scale with attribute, then pass the value to it

    const linesGroup = wrapper.append('g')
    const hoverGroup = wrapper.append('g')

    // Draw lines
    function dataJoin () {
      linesGroup.selectAll('path')
        .data(data, d => d.party_id)
        .join(enterFn, updateFn, exitFn)
      hoverGroup.selectAll('path') // Draw on top of the normal lines
        .data(data.filter(d => d.hovered), d => d.party_id)
        .join(enterFnHover, updateFn, exitFn)
    }
    dataJoin()

    // Draw axes
    function makeAxis (attr) {
      const axis = d3.axisLeft(yScales[attr])
      if (attr === 'family') axis.tickFormat(id => factions[id])
      if (attr === 'country') axis.tickFormat(id => countries[id])
      return axis
    }
    const axes = wrapper.selectAll('axis')
      .data(attributeIds)
      .enter()
      .append('g')
      .attr('class', 'axis')
      .attr('transform', attr => `translate(${xScale(xAccessor(attr))}, 0)`) // Each attribute positions the corresponding axis
      .each(function (attr) {
        d3.select(this)
          .call(makeAxis(attr))
          .append('text') // Legend operations
          .attr('class', 'legend')
          .attr('transform', `rotate(${LEGEND_ROTATION})`)
          .attr('x', dimensions.legend.x)
          .attr('y', dimensions.margin.top - dimensions.legend.y)
          .attr('text-anchor', 'middle')
          .text(attributes[attr])
      })

    // Join functions
    function enterFn (sel) {
      return sel.append('path')
        .attr('class', 'line')
        // For each datum, create [attr, value] and give it to the line (it will connect the values of the many attributes)
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
    function enterFnHover (sel) {
      return sel.append('path')
        .attr('class', 'line-hovered')
        .attr('d', d => line(attributeIds.map(attr => [attr, yAccessors[attr](d)])))
    }
    function updateFn (sel) {
      return sel.call(update => update
        .transition()
        .duration(TR_TIME)
        .attr('d', d => line(attributeIds.map(attr => [attr, yAccessors[attr](d)])))
      )
    }
    function exitFn (sel) {
      sel.call(exit => exit.remove())
    }

    // Update functions
    updateData = function () {
      dataJoin()
    }

    updateSize = function () {
      const trans = d3.transition().duration(TR_TIME)

      wrapper.attr('width', dimensions.width).attr('height', dimensions.height)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      attributeIds.forEach(attr => yScales[attr].range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top]))

      axes.transition(trans)
        .attr('transform', attr => `translate(${xScale(xAccessor(attr))}, 0)`)
        .each(function (attr) {
          d3.select(this)
            .transition(trans)
            .call(makeAxis(attr))
        })

      dataJoin()
    }

    console.debug('Finished drawing parallel coordinates')
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

  // Save the callbacks (update hovered property)
  parallelCoordinates.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }
  parallelCoordinates.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    console.debug('Parallel coordinates received the functions for updating the model on hover')
    return this
  }

  console.debug('Finished creating parallel coordinates configurable function')
  return parallelCoordinates
}
