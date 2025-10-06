import * as d3 from 'd3'
import { factionsColors } from '@/utils'

const TR_TIME = 1000 // TEMPORARY

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []

  // Which attributes to use
  const xAccessor = d => d.mds1
  const yAccessor = d => d.mds2
  const rAccessor = d => d.vote

  const dimensions = {
    width: 600,
    height: 350,
    margin: { top: 22, right: 12, bottom: 95, left: 45, text: 30 },
    offset: { x: 1.5, y: 1 },
    radius: { min: 4, max: 30 }
  }
  let updateSize

  // It draws and can be configured (it is returned again when something changes)
  function scatterPlot (containerDiv) {
    data = data.filter(d => d.year === 2024) // TEMPORARY

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(data, d => xAccessor(d) - dimensions.offset.x), d3.max(data, d => xAccessor(d) + dimensions.offset.x)])
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => yAccessor(d) - dimensions.offset.y), d3.max(data, d => yAccessor(d) + dimensions.offset.y)])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    // How to compute circles radius
    const radius = d3.scaleSqrt() // Sqrt to avoid exponential growth
      .domain(d3.extent(data, rAccessor))
      .range([dimensions.radius.min, dimensions.radius.max])

    const drawArea = wrapper.append('g') // It contains points' g and clip
    const pointsGroup = drawArea.append('g')

    // Draw points
    function dataJoin () {
      pointsGroup.selectAll('circle')
        .data(data.sort((a, b) => { // Bigger circles on the background
          return d3.descending(rAccessor(a), rAccessor(b))
        }))
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Draw axes
    const xAxis = drawArea.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
      .call(d3.axisBottom(xScale))
    const yAxis = drawArea.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${dimensions.margin.left}, 0)`)
      .call(d3.axisLeft(yScale))

    // Draw axes legends
    const xLegend = wrapper.append('text')
      .attr('class', 'legend')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.margin.text)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 1')
    const yLegend = wrapper.append('text')
      .attr('class', 'legend')
      .attr('transform', 'rotate(-90)')
      .attr('x', -dimensions.height / 2)
      .attr('y', dimensions.margin.left - dimensions.margin.text)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 2')

    // Join functions
    function enterFn (sel) {
      return sel.append('circle')
        .attr('class', 'circle')
        .attr('cx', d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
        .attr('r', d => radius(rAccessor(d)))
        .attr('fill', d => factionsColors[d.family]) // TEMPORARY
    }
    function updateFn (sel) {
      return sel.call(update => update
        .transition()
        .duration(TR_TIME)
        .attr('cx', d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
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
    updateSize = function () {
      wrapper.attr('width', dimensions.width).attr('height', dimensions.height)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      yScale.range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])
      xAxis.transition()
        .duration(TR_TIME)
        .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
        .call(d3.axisBottom(xScale))
      yAxis.transition()
        .duration(TR_TIME)
        .call(d3.axisLeft(yScale))
      xLegend.transition()
        .duration(TR_TIME)
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.margin.text)
      yLegend.transition()
        .duration(TR_TIME)
        .attr('x', -dimensions.height / 2)
      dataJoin()
    }

    console.debug('Finished drawing scatter plot')
  }

  scatterPlot.data = function (_) {
    if (!arguments.length) return data
    data = _
    return scatterPlot
  }
  scatterPlot.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return scatterPlot
  }

  console.debug('Finished creating scatter plot configurable function')
  return scatterPlot
}
