import * as d3 from 'd3'
import { attributes, factions } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  const dimensions = {
    width: 1100,
    height: 350,
    margin: { top: 50, right: 75, bottom: 10, left: 125 }
  }

  // It draws and can be configured (it is returned again when something changes)
  function parallelCoordinates (containerDiv) {
    data = data.filter(d => d.year === 2024) // TEMPORARY
    const attributeIds = Object.keys(attributes)

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scalePoint()
      .domain(attributeIds)
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    // Define more y scales, one for each attribute
    const yScales = {} // Will be a map
    const range = [dimensions.height - dimensions.margin.bottom, dimensions.margin.top]
    attributeIds.forEach(a => {
      if (a === 'family') {
        yScales[a] = d3.scaleLinear() // Key (attribute) -> value (scale associated to that attribute)
          .domain([1, 11])
          .range(range)
      } else if (a === 'eu_position' || a === 'eu_intmark' || a === 'eu_foreign') {
        yScales[a] = d3.scaleLinear()
          .domain([1, 7])
          .range(range)
      } else {
        yScales[a] = d3.scaleLinear()
          .domain([0, 10])
          .range(range)
      }
    })

    // How to generate the lines
    const line = d3.line() // d is given as [attribute name, value]
      .x(d => xScale(d[0])) // Place on the correct scale using the attribute name
      .y(d => yScales[d[0]](d[1])) // Find right scale with attribute, then pass the value

    // Draw lines
    wrapper.append('g')
      .selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'line')
      // For each datum, create [attr, value] and give it to the line (it will connect the values of different attributes)
      .attr('d', d => line(attributeIds.map(attr => [attr, d[attr]])))

    // y axes
    wrapper.selectAll('axis')
      .data(attributeIds)
      .enter()
      .append('g')
      .attr('class', 'axis')
      .attr('transform', d => `translate(${xScale(d)}, 0)`) // Each attribute positions the corresponding axis
      .each(function (d) {
        const axis = d3.axisLeft(yScales[d])

        if (d === 'family') {
          axis.tickFormat(id => factions[id])
        } else if (d === 'eu_position' || d === 'eu_intmark' || d === 'eu_foreign') {
          axis.ticks(7)
        }

        d3.select(this).call(axis) // Create axis
          .append('text') // Text operations
          .attr('class', 'legend')
          .attr('transform', 'rotate(-13)')
          .attr('x', 10)
          .attr('y', dimensions.margin.top - 18)
          .attr('text-anchor', 'middle')
          .text(attributes[d])
      })

    console.debug('Finished drawing parallel coordinates')
  }

  // Update functions - called when something changes, they draw again the views
  parallelCoordinates.data = function (_) {
    if (!arguments.length) return data
    data = _
    return parallelCoordinates
  }
  parallelCoordinates.width = function (_) {
    if (!arguments.length) return dimensions.width
    dimensions.width = _
    return parallelCoordinates
  }
  parallelCoordinates.height = function (_) {
    if (!arguments.length) return dimensions.height
    dimensions.height = _
    return parallelCoordinates
  }

  console.debug('Finished creating parallel coordinates configurable function')
  return parallelCoordinates
}
