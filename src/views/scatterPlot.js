import * as d3 from 'd3'
import { factions, hideTooltip, moveTooltip, showTooltip, TR_TIME } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData

  // Which attributes to use
  const xAccessor = d => d.mds1
  const yAccessor = d => d.mds2
  const rAccessor = d => d.vote
  const colorAccessor = d => factions[d.family].color

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 22, right: 12, bottom: 60, left: 47 },
    offset: { x: 2.5, y: 2.5 },
    radius: { min: 4, max: 30 },
    legendY: 30
  }
  let updateSize

  // Do animation or not
  let doTransition = false

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // Brushing
  let onBrush = _ => {}

  // It draws and can be configured (it is returned again when something changes)
  function scatterPlot (containerDiv) {
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
        }), d => d.party_id)
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Join functions
    function enterFn (sel) {
      return sel.append('circle')
        .attr('class', 'circle')
        .attr('cx', d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
        .attr('r', d => radius(rAccessor(d)))
        .style('stroke', d => d.brushed ? 'red' : null)
        .attr('fill', d => colorAccessor(d))
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
      sel.style('stroke', d => d.brushed ? 'red' : null)
        .attr('fill', d => d.hovered ? 'white' : colorAccessor(d))
        .style('opacity', d => d.hovered ? 1 : null)
      return sel.call(update => update
        .transition()
        .duration(doTransition ? TR_TIME : 0)
        .attr('cx', d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
      )
    }
    function exitFn (sel) {
      sel.call(exit => exit.remove())
    }

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
    const xLegend = drawArea.append('text')
      .attr('class', 'legend')
      .attr('x', (dimensions.width + dimensions.margin.left - dimensions.margin.right) / 2)
      .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.legendY)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 1')
    const yLegend = drawArea.append('text')
      .attr('class', 'legend')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(dimensions.height + dimensions.margin.top - dimensions.margin.bottom) / 2)
      .attr('y', dimensions.margin.left - dimensions.legendY)
      .attr('text-anchor', 'middle')
      .text('MDS dimension 2')

    // Brush
    function updateBrush (sel) {
      const [[x0, y0], [x1, y1]] = sel
      const brushedData = new Set(
        data.filter(d => {
          const x = xScale(xAccessor(d))
          const y = yScale(yAccessor(d))
          return x0 <= x && x <= x1 && y0 <= y && y <= y1
        }).map(d => d.party_id)
      )
      onBrush(brushedData, 'scatterPlot')
    }
    function clearBrush (sel) {
      onBrush(null, 'scatterPlot')
    }
    drawArea.call(d3.brush()
      .extent([[xScale.range()[0], yScale.range()[1]], [xScale.range()[1], yScale.range()[0]]])
      .on('brush', (event) => {
        updateBrush(event.selection)
      })
      .on('end', (event) => {
        if (!event.selection) clearBrush(event.selection)
      })
    )

    // Update functions
    updateData = function () {
      doTransition = false
      dataJoin()
    }

    updateSize = function () {
      const trans = d3.transition().duration(TR_TIME)

      wrapper.attr('width', dimensions.width).attr('height', dimensions.height)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      yScale.range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

      xAxis.transition(trans)
        .attr('transform', `translate(0, ${dimensions.height - dimensions.margin.bottom})`)
        .call(d3.axisBottom(xScale))
      yAxis.transition(trans)
        .call(d3.axisLeft(yScale))
      xLegend.transition(trans)
        .attr('x', (dimensions.width + dimensions.margin.left - dimensions.margin.right) / 2)
        .attr('y', dimensions.height - dimensions.margin.bottom + dimensions.legendY)
      yLegend.transition(trans)
        .attr('x', -(dimensions.height + dimensions.margin.top - dimensions.margin.bottom) / 2)

      doTransition = true
      dataJoin()
    }

    console.debug('Finished drawing scatter plot')
  }

  scatterPlot.data = function (_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return scatterPlot
  }
  scatterPlot.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return scatterPlot
  }

  // Save the callbacks (update hovered property)
  scatterPlot.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }
  scatterPlot.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    console.debug('Scatter plot received the functions for updating the model on hover')
    return this
  }
  scatterPlot.bindBrush = function (callback) {
    onBrush = callback
    console.debug('Scatter plot received the functions for updating the model on brush')
    return this
  }

  console.debug('Finished creating scatter plot configurable function')
  return scatterPlot
}
