import * as d3 from 'd3'
import { attributes, countries, factions } from '@/utils'

const TEXT_ROTATION = -13

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []

  // How to access the data for each dimension
  const xAccessor = attr => attr
  const yAccessors = {}

  const dimensions = {
    width: 1100,
    height: 350,
    margin: { top: 50, right: 75, bottom: 10, left: 125, textX: 10, textY: 18 }
  }
  let updateSize

  // It draws and can be configured (it is returned again when something changes)
  function parallelCoordinates (containerDiv) {
    data = data.filter(d => d.year === 2024) // TEMPORARY
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
    const yScales = {} // Will be a map
    attributeIds.forEach(attr => {
      if (attr === 'country') {
        yScales[attr] = d3.scalePoint()
          .domain(Object.keys(countries).map(Number))
          .range(scaleRange)
      } else if (attr === 'family') {
        yScales[attr] = d3.scaleLinear() // Key (attribute) -> value (scale associated to that attribute)
          .domain([1, 11])
          .range(scaleRange)
      } else {
        yScales[attr] = d3.scaleLinear()
          .domain([0, 10])
          .range(scaleRange)
      }
      yAccessors[attr] = d => d[attr] // Accessor for the specific attribute
    })

    // How to generate the lines
    const line = d3.line() // d is given as [attribute name, value]
      .x(([attr, val]) => xScale(xAccessor(attr))) // Place on the correct scale using the attribute name
      .y(([attr, val]) => yScales[attr](val)) // Find right scale with attribute, then pass the value to it

    // Draw lines
    wrapper.append('g')
      .selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'line')
      // For each datum, create [attr, value] and give it to the line (it will connect the values of different attributes)
      .attr('d', d => line(attributeIds.map(attr => [attr, yAccessors[attr](d)])))

    // Draw axes
    wrapper.selectAll('axis')
      .data(attributeIds)
      .enter()
      .append('g')
      .attr('class', 'axis')
      .attr('transform', attr => `translate(${xScale(xAccessor(attr))}, 0)`) // Each attribute positions the corresponding axis
      .each(function (attr) {
        const axis = d3.axisLeft(yScales[attr])

        // Ticks
        if (attr === 'family') {
          axis.tickFormat(id => factions[id])
        }

        d3.select(this).call(axis) // Create single axis
          .append('text') // Text operations
          .attr('class', 'legend')
          .attr('transform', `rotate(${TEXT_ROTATION})`)
          .attr('x', dimensions.margin.textX)
          .attr('y', dimensions.margin.top - dimensions.margin.textY)
          .attr('text-anchor', 'middle')
          .text(attributes[attr])
      })

    console.debug('Finished drawing parallel coordinates')
  }

  parallelCoordinates.data = function (_) {
    if (!arguments.length) return data
    data = _
    return parallelCoordinates
  }
  parallelCoordinates.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return parallelCoordinates
  }

  console.debug('Finished creating parallel coordinates configurable function')
  return parallelCoordinates
}
