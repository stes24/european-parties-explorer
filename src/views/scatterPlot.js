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
    margin: { top: 0, right: 12, bottom: 60, left: 47 },
    offset: { x: 3.5, y: 2.5 },
    radius: { min: 4, max: 30 },
    legendY: 30
  }
  let updateSize

  // Do animation or not
  let doTransition = false
  let isUpdating = false // Prevent recursive updates

  // Interaction mode
  let interactionMode = 'hover'

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // Brushing
  let onBrush = _ => {}
  let brushExtent = null // Store brush selection extent [[x0, y0], [x1, y1]]
  let isBrushing = false // Flag to prevent restoration during active brushing
  let lastDataSignature = null // Track data changes to detect year changes vs hover updates

  // It draws and can be configured (it is returned again when something changes)
  function scatterPlot (containerDiv) {
    // Add mode radio buttons
    const modeContainer = containerDiv.append('div')
      .attr('class', 'interaction-mode-container')

    modeContainer.append('span')
      .attr('class', 'mode-label')
      .text('Mode of interaction:')

    const hoverLabel = modeContainer.append('label')
      .attr('class', 'mode-radio-label')

    hoverLabel.append('input')
      .attr('type', 'radio')
      .attr('name', 'scatter-interaction-mode')
      .attr('value', 'hover')
      .property('checked', interactionMode === 'hover')
      .on('change', () => switchMode('hover'))

    hoverLabel.append('span').text('hover')

    const selectLabel = modeContainer.append('label')
      .attr('class', 'mode-radio-label')

    selectLabel.append('input')
      .attr('type', 'radio')
      .attr('name', 'scatter-interaction-mode')
      .attr('value', 'brush')
      .property('checked', interactionMode === 'brush')
      .on('change', () => switchMode('brush'))

    selectLabel.append('span').text('select')

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

    // Store brush behavior
    const brushBehavior = d3.brush()
      .extent([[xScale.range()[0], yScale.range()[1]], [xScale.range()[1], yScale.range()[0]]])

    let brushActive = false

    // Draw points
    function dataJoin () {
      // Check if any data is brushed
      brushActive = data.some(d => d.brushed)

      pointsGroup.selectAll('circle')
        .data(data.sort((a, b) => {
          // First priority: hovered state (hovered on top)
          if (a.hovered !== b.hovered) {
            return a.hovered ? 1 : -1 // 1 = move a after b, -1 = move a before b
          }
          // Second priority: brushed state (brushed above non-brushed)
          if (a.brushed !== b.brushed) {
            return a.brushed ? 1 : -1
          }
          // Third priority: within each group, bigger circles on the background
          return d3.descending(rAccessor(a), rAccessor(b))
        }), d => d.party_id)
        .join(enterFn, updateFn, exitFn)
    }
    dataJoin()

    // Join functions
    function enterFn (sel) {
      const circles = sel.append('circle')
        .attr('class', d => {
          if (d.brushed) return 'circle-brushed'
          if (brushActive) return 'circle-deselected'
          return 'circle'
        })
        .attr('cx', d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
        .attr('r', d => radius(rAccessor(d)))
        .attr('fill', d => d.hovered ? 'white' : colorAccessor(d))
        .style('opacity', d => d.hovered ? 0.95 : null)
        .style('pointer-events', d => {
          if (interactionMode === 'brush') return 'none'
          // In hover mode, let CSS handle pointer-events for deselected circles
          if (brushActive && !d.brushed) return null
          return 'all'
        })

      // Add hover listeners only in hover mode
      if (interactionMode === 'hover') {
        circles
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

      return circles
    }
    function updateFn (sel) {
      sel.attr('class', d => {
        if (d.brushed) return 'circle-brushed'
        if (brushActive) return 'circle-deselected'
        return 'circle'
      })
        .attr('fill', d => d.hovered ? 'white' : colorAccessor(d))
        .style('opacity', d => d.hovered ? 0.95 : null)
        .style('pointer-events', d => {
          if (interactionMode === 'brush') return 'none'
          // In hover mode, let CSS handle pointer-events for deselected circles
          if (brushActive && !d.brushed) return null
          return 'all'
        })
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
      // Store the brush extent for later recalculation
      brushExtent = [[x0, y0], [x1, y1]]
      // Calculate which parties fall within this brush
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
      brushExtent = null
      onBrush(null, 'scatterPlot')
    }

    brushBehavior
      .on('start', () => {
        isBrushing = true
      })
      .on('brush', (event) => {
        updateBrush(event.selection)
      })
      .on('end', (event) => {
        isBrushing = false
        if (!event.selection) clearBrush(event.selection)
      })

    // Apply brush only in brush mode
    if (interactionMode === 'brush') {
      drawArea.call(brushBehavior)
    }

    // Switch interaction mode
    function switchMode (newMode) {
      interactionMode = newMode

      // Update circle pointer events and listeners
      pointsGroup.selectAll('circle')
        .style('pointer-events', d => {
          if (newMode === 'brush') return 'none'
          // In hover mode, let CSS handle pointer-events for deselected circles
          if (brushActive && !d.brushed) return null
          return 'all'
        })
        .on('mouseenter', null)
        .on('mousemove', null)
        .on('mouseleave', null)

      if (newMode === 'hover') {
        // Enable hover interactions
        pointsGroup.selectAll('circle')
          .on('mouseenter', (event, d) => {
            onMouseEnter(d)
            showTooltip(event, d)
          })
          .on('mousemove', (event) => moveTooltip(event))
          .on('mouseleave', (event, d) => {
            onMouseLeave(d)
            hideTooltip()
          })

        // Disable brush
        drawArea.on('.brush', null)
        drawArea.selectAll('.selection, .overlay, .handle').remove()
      } else {
        // Disable hover interactions (already done above with null)
        hideTooltip()

        // Enable brush
        drawArea.call(brushBehavior)

        // Restore the visual brush if there's a stored extent
        if (brushExtent) {
          drawArea.call(brushBehavior.move, brushExtent)
        }
      }
    }

    // Update functions
    updateData = function () {
      if (isUpdating) return // Prevent recursive updates
      isUpdating = true

      try {
        // Check if the data structure has changed (year change) vs just properties (hover)
        const currentDataSignature = data.map(d => d.party_id).join(',') // Converts array to string separated by commas
        const dataStructureChanged = currentDataSignature !== lastDataSignature
        lastDataSignature = currentDataSignature

        // Recalculate which parties in the NEW data fall within the existing brush extent
        // Only when data structure changes (year change) to avoid performance issues with hover
        if (brushExtent && !isBrushing && dataStructureChanged) {
          const [[x0, y0], [x1, y1]] = brushExtent
          const brushedData = new Set(
            data.filter(d => {
              const x = xScale(xAccessor(d))
              const y = yScale(yAccessor(d))
              return x0 <= x && x <= x1 && y0 <= y && y <= y1
            }).map(d => d.party_id)
          )
          onBrush(brushedData, 'scatterPlot')

          // Restore the visual brush only if in brush mode
          if (interactionMode === 'brush') {
            drawArea.call(brushBehavior.move, brushExtent)
          }
        }

        doTransition = false
        dataJoin()
      } finally {
        isUpdating = false
      }
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
