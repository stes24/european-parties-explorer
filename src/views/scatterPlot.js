import * as d3 from 'd3'
import { factionsColors } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  const dimensions = {
    width: 800,
    height: 600,
    margin: { top: 22, right: 12, bottom: 95, left: 45 }
  }

  // It draws and can be configured (it is returned again when something changes)
  function scatterPlot (containerDiv) {
    data = data.filter(d => d.year === 2024) // TEMPORARY

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.mds1 - 1.5), d3.max(data, d => d.mds1 + 1.5)])
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.mds2 - 1), d3.max(data, d => d.mds2 + 1)])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    // How to compute circles radius
    const radius = d3.scaleSqrt() // Sqrt to avoid exponential growth
      .domain(d3.extent(data, d => d.vote))
      .range([4, 30])

    // It contains points' g and clip
    const drawArea = wrapper.append('g')

    // Draw points
    drawArea.append('g')
      .selectAll('circle')
      .data(data.sort((a, b) => { // Bigger circles on the background
        return d3.descending(a.vote, b.vote)
      }))
      .enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', d => xScale(d.mds1))
      .attr('cy', d => yScale(d.mds2))
      .attr('r', d => radius(d.vote))
      .attr('fill', d => factionsColors[d.family])

    // Axes
    drawArea.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
      .call(d3.axisBottom(xScale))
    drawArea.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${dimensions.margin.left}, 0)`)
      .call(d3.axisLeft(yScale))

    // Axes legends
    wrapper.append('text')
      .attr('class', 'legend')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - dimensions.margin.bottom + 30)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 1')
    wrapper.append('text')
      .attr('class', 'legend')
      .attr('transform', 'rotate(-90)')
      .attr('x', -dimensions.height / 2)
      .attr('y', dimensions.margin.left - 30)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 2')

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
