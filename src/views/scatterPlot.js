import * as d3 from 'd3'
import { factions, regions, hideTooltip, moveTooltip, showTooltip, TR_TIME } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData

  // Which attributes to use
  const xAccessor = d => d.mds1
  const yAccessor = d => d.mds2
  const rAccessor = d => d.vote

  let colorBy = 'faction' // 'faction' or 'region'
  const colorAccessor = d => colorBy === 'faction' ? factions[d.family].color : regions[d.region]

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 2, right: 12, bottom: 70, left: 47 },
    offset: { xLeft: 1.5, xRight: 5.5, y: 2.5 },
    radius: {
      fixed: 8,
      // Discrete radius values for vote intervals
      intervals: [
        { maxVotes: 5, radius: 5 }, // 0% <= votes < 5%
        { maxVotes: 10, radius: 8 }, // 5% <= votes < 10%
        { maxVotes: 25, radius: 13 }, // 10% <= votes < 25%
        { maxVotes: Infinity, radius: 22 } // votes >= 25%
      ]
    },
    legendY: 30
  }
  let updateSize

  // Do animation or not
  let doTransition = false
  let isUpdating = false // Prevent recursive updates

  // Interaction mode
  let interactionMode = 'hover'
  let varyCircleSize = true // Whether circle size varies with votes

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // Color change callback
  let onColorChange = _ => {}

  // Size legend update function
  let updateSizeLegend

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

    hoverLabel.append('span').text('zoom, move and hover')

    const selectLabel = modeContainer.append('label')
      .attr('class', 'mode-radio-label')

    selectLabel.append('input')
      .attr('type', 'radio')
      .attr('name', 'scatter-interaction-mode')
      .attr('value', 'brush')
      .property('checked', interactionMode === 'brush')
      .on('change', () => switchMode('brush'))

    selectLabel.append('span').text('select')

    // Add size control checkbox
    const sizeControlContainer = containerDiv.append('div')
      .attr('class', 'interaction-mode-container')
      .style('justify-content', 'space-between')

    const leftSection = sizeControlContainer.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '6px')

    const sizeLabel = leftSection.append('label')
      .attr('class', 'mode-radio-label')

    sizeLabel.append('input')
      .attr('type', 'checkbox')
      .attr('id', 'vary-circle-size')
      .property('checked', varyCircleSize)
      .on('change', (event) => {
        varyCircleSize = event.target.checked
        updateSizeLegend()
        doTransition = true
        dataJoin()
        doTransition = false
      })

    sizeLabel.append('span').text('Size = votes in most recent national election (%)')

    // Add color dropdown on the right edge
    const rightSection = sizeControlContainer.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '6px')

    rightSection.append('span')
      .attr('class', 'mode-label')
      .text('Color:')

    rightSection.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'color-attribute-select')
      .on('change', function () {
        colorBy = this.value
        onColorChange(colorBy) // Notify controller of color change
        doTransition = false
        dataJoin()
      })
      .selectAll('option')
      .data([
        { value: 'faction', label: 'Political faction' },
        { value: 'region', label: 'European region' }
      ])
      .join('option')
      .attr('value', d => d.value)
      .property('selected', d => d.value === colorBy)
      .text(d => d.label)

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    wrapper.append('defs')
      .append('clipPath')
      .attr('id', 'scatter-clip')
      .append('rect')
      .attr('x', dimensions.margin.left)
      .attr('y', dimensions.margin.top)
      .attr('width', dimensions.width - dimensions.margin.left - dimensions.margin.right)
      .attr('height', dimensions.height - dimensions.margin.top - dimensions.margin.bottom)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(data, d => xAccessor(d) - dimensions.offset.xLeft), d3.max(data, d => xAccessor(d) + dimensions.offset.xRight)])
      .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => yAccessor(d) - dimensions.offset.y), d3.max(data, d => yAccessor(d) + dimensions.offset.y)])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    // Current scales (that will be modified by zoom)
    let currentXScale = xScale
    let currentYScale = yScale
    let zoomTransform = d3.zoomIdentity // Store zoom state

    // Function to get discrete radius based on vote percentage
    const getDiscreteRadius = (vote) => {
      for (const interval of dimensions.radius.intervals) {
        if (vote < interval.maxVotes) {
          return interval.radius
        }
      }
      return dimensions.radius.intervals[dimensions.radius.intervals.length - 1].radius
    }

    // Function to get radius based on whether size varies
    const radius = d => varyCircleSize ? getDiscreteRadius(rAccessor(d)) : dimensions.radius.fixed

    const drawArea = wrapper.append('g') // It contains points' g and clip
    const pointsGroup = drawArea.append('g')
      .attr('clip-path', 'url(#scatter-clip)')

    // Store brush behavior
    const brushBehavior = d3.brush()
      .extent([[xScale.range()[0], yScale.range()[1]], [xScale.range()[1], yScale.range()[0]]])

    let brushActive = false
    let currentHoveredPartyId = null // Track currently hovered party

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
          // Third priority: always sort by vote (within each group, bigger circles on the background)
          return d3.descending(rAccessor(a), rAccessor(b))
        }), d => d.party_id)
        .join(enterFn, updateFn, exitFn)
    }

    // Manual hover detection respecting z-order priority
    function setupManualHover () {
      if (interactionMode !== 'hover') return

      wrapper.on('mousemove', function (event) {
        const [mouseX, mouseY] = d3.pointer(event, this)

        // Find all circles under the cursor, with their priority
        const candidatesWithPriority = data
          .filter(d => {
            // When brushing is active, only allow hovering brushed circles
            if (brushActive && !d.brushed) return false

            const cx = currentXScale(xAccessor(d))
            const cy = currentYScale(yAccessor(d))
            const r = radius(d)
            const distance = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2)
            return distance <= r
          })
          .map(d => ({
            party: d,
            // Calculate priority WITHOUT considering current hover state
            priority: (d.brushed ? 100000 : 0) - rAccessor(d)
          }))

        if (candidatesWithPriority.length > 0) {
          // Pick the candidate with highest priority
          candidatesWithPriority.sort((a, b) => b.priority - a.priority)
          const topCandidate = candidatesWithPriority[0].party

          // Only update if it's a different party
          if (currentHoveredPartyId !== topCandidate.party_id) {
            // Clear previous hover
            if (currentHoveredPartyId !== null) {
              const prevParty = data.find(d => d.party_id === currentHoveredPartyId)
              if (prevParty) {
                onMouseLeave(prevParty)
              }
            }

            // Set new hover
            currentHoveredPartyId = topCandidate.party_id
            onMouseEnter(topCandidate)
            showTooltip(event, topCandidate)
          } else {
            // Same party, just move tooltip
            moveTooltip(event)
          }
        } else {
          // No circle under cursor, clear hover
          if (currentHoveredPartyId !== null) {
            const prevParty = data.find(d => d.party_id === currentHoveredPartyId)
            if (prevParty) {
              onMouseLeave(prevParty)
            }
            currentHoveredPartyId = null
            hideTooltip()
          }
        }
      })

      wrapper.on('mouseleave', () => {
        if (currentHoveredPartyId !== null) {
          const prevParty = data.find(d => d.party_id === currentHoveredPartyId)
          if (prevParty) {
            onMouseLeave(prevParty)
          }
          currentHoveredPartyId = null
          hideTooltip()
        }
      })
    }

    // Join functions
    function enterFn (sel) {
      const circles = sel.append('circle')
        .attr('class', d => {
          if (d.brushed) return 'circle-brushed'
          if (brushActive) return 'circle-deselected'
          return 'circle'
        })
        .attr('cx', d => currentXScale(xAccessor(d)))
        .attr('cy', d => currentYScale(yAccessor(d)))
        .attr('r', d => radius(d))
        .attr('fill', d => d.hovered ? 'white' : colorAccessor(d))
        .style('opacity', d => d.hovered ? 0.95 : null)
        .style('pointer-events', 'none') // Disable default pointer events, use manual detection

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
        .style('pointer-events', 'none') // Always use manual hover detection
      return sel.call(update => update
        .transition()
        .duration(doTransition ? TR_TIME : 0)
        .attr('cx', d => currentXScale(xAccessor(d)))
        .attr('cy', d => currentYScale(yAccessor(d)))
        .attr('r', d => radius(d))
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

    // Size legend in top right corner
    const sizeLegendGroup = wrapper.append('g')
      .attr('class', 'size-legend')
      .attr('transform', `translate(${dimensions.width - dimensions.margin.right - 80}, ${dimensions.margin.top + 10})`)
      .style('display', varyCircleSize ? null : 'none')

    // Generate legend data from intervals
    const legendData = dimensions.radius.intervals.map((interval, i) => {
      const minVotes = i === 0 ? 0 : dimensions.radius.intervals[i - 1].maxVotes
      const maxVotes = interval.maxVotes
      const label = maxVotes === Infinity
        ? `≥${maxVotes === Infinity ? dimensions.radius.intervals[i - 1].maxVotes : maxVotes}%`
        : `<${maxVotes}%`
      return {
        minVotes,
        maxVotes,
        radius: interval.radius,
        label
      }
    })

    // Calculate positions with fixed gap between circumferences
    const maxRadius = Math.max(...legendData.map(d => d.radius))
    const gapBetweenCircles = 3 // Fixed gap between circle edges

    // Calculate cumulative y positions
    let currentY = 0
    const positions = []
    legendData.forEach((d, i) => {
      if (i === 0) {
        currentY = d.radius // Start with the radius of the first circle
      } else {
        currentY += legendData[i - 1].radius + gapBetweenCircles + d.radius
      }
      positions.push(currentY)
    })

    // Calculate total legend height for background
    const totalLegendHeight = positions[positions.length - 1] + legendData[legendData.length - 1].radius + 10
    const legendWidth = maxRadius * 2 + 40

    // Add background rectangle
    sizeLegendGroup.append('rect')
      .attr('x', -5)
      .attr('y', -5)
      .attr('width', legendWidth)
      .attr('height', totalLegendHeight)
      .attr('fill', '#4a4a4a')
      .attr('stroke', '#CCCCCC')
      .attr('stroke-width', '1px')
      .attr('rx', 4)
      .attr('ry', 4)

    // Draw legend items
    legendData.forEach((d, i) => {
      const itemGroup = sizeLegendGroup.append('g')
        .attr('transform', `translate(0, ${positions[i]})`)

      // Draw circle
      itemGroup.append('circle')
        .attr('cx', maxRadius)
        .attr('cy', 0)
        .attr('r', d.radius)
        .attr('fill', 'none')
        .attr('stroke', '#CCCCCC')
        .attr('stroke-width', '1.5px')

      // Draw label
      itemGroup.append('text')
        .attr('x', maxRadius * 2 + 2)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('fill', 'white')
        .style('font-size', '12px')
        .text(d.label)
    })

    // Function to update size legend visibility
    updateSizeLegend = function () {
      sizeLegendGroup.style('display', varyCircleSize ? null : 'none')
    }

    // Brush
    function updateBrush (sel) {
      const [[x0, y0], [x1, y1]] = sel
      // Store the brush extent for later recalculation
      brushExtent = [[x0, y0], [x1, y1]]
      // Calculate which parties fall within this brush
      const brushedData = new Set(
        data.filter(d => {
          const x = currentXScale(xAccessor(d))
          const y = currentYScale(yAccessor(d))
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

    // Zoom behavior
    const handleZoom = (event) => {
      zoomTransform = event.transform

      // Create new scales based on the transformation
      currentXScale = zoomTransform.rescaleX(xScale)
      currentYScale = zoomTransform.rescaleY(yScale)

      // Update axes
      xAxis.call(d3.axisBottom(currentXScale))
      yAxis.call(d3.axisLeft(currentYScale))

      // Reposition existing circles
      pointsGroup.selectAll('circle')
        .attr('cx', d => currentXScale(xAccessor(d)))
        .attr('cy', d => currentYScale(yAccessor(d)))
    }

    const zoom = d3.zoom()
      .scaleExtent([0.8, 8])
      .extent([[0, 0], [dimensions.width, dimensions.height]])
      .on('zoom', handleZoom)

    // Apply brush only in brush mode, otherwise enable zoom
    if (interactionMode === 'brush') {
      drawArea.call(brushBehavior)
    } else {
      // Enable zoom and manual hover in hover mode
      wrapper.call(zoom)
      setupManualHover()
    }

    dataJoin() // Initial draw

    // Switch interaction mode
    function switchMode (newMode) {
      interactionMode = newMode

      if (newMode === 'hover') {
        // Clear any current hover state
        if (currentHoveredPartyId !== null) {
          const prevParty = data.find(d => d.party_id === currentHoveredPartyId)
          if (prevParty) {
            onMouseLeave(prevParty)
          }
          currentHoveredPartyId = null
        }

        // Disable brush
        drawArea.on('.brush', null)
        drawArea.selectAll('.selection, .overlay, .handle').remove()

        // ENABLE ZOOM (and restore the last state)
        wrapper.call(zoom)
          .call(zoom.transform, zoomTransform)

        // Enable manual hover detection
        setupManualHover()
      } else {
        // Clear any current hover state
        if (currentHoveredPartyId !== null) {
          const prevParty = data.find(d => d.party_id === currentHoveredPartyId)
          if (prevParty) {
            onMouseLeave(prevParty)
          }
          currentHoveredPartyId = null
        }

        // DISABLE ZOOM (remove listener) to leave space for the brush
        wrapper.on('.zoom', null)

        // Disable hover interactions
        hideTooltip()
        wrapper.on('mousemove', null)
        wrapper.on('mouseleave', null)

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

        // Reset hover state if data structure changed (year change)
        if (dataStructureChanged && currentHoveredPartyId !== null) {
          const partyStillExists = data.some(d => d.party_id === currentHoveredPartyId)
          if (!partyStillExists) {
            currentHoveredPartyId = null
          }
        }

        // Recalculate which parties in the NEW data fall within the existing brush extent
        // Only when data structure changes (year change) to avoid performance issues with hover
        if (brushExtent && !isBrushing && dataStructureChanged) {
          const [[x0, y0], [x1, y1]] = brushExtent
          const brushedData = new Set(
            data.filter(d => {
              const x = currentXScale(xAccessor(d))
              const y = currentYScale(yAccessor(d))
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
      wrapper.select('#scatter-clip rect')
        .transition(trans)
        .attr('x', dimensions.margin.left)
        .attr('y', dimensions.margin.top)
        .attr('width', dimensions.width - dimensions.margin.left - dimensions.margin.right)
        .attr('height', dimensions.height - dimensions.margin.top - dimensions.margin.bottom)
      xScale.range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
      yScale.range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

      wrapper.call(zoom.transform, d3.zoomIdentity)
      currentXScale = xScale
      currentYScale = yScale

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
      sizeLegendGroup.transition(trans)
        .attr('transform', `translate(${dimensions.width - dimensions.margin.right - 80}, ${dimensions.margin.top + 10})`)

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
  scatterPlot.bindColorChange = function (callback) {
    onColorChange = callback
    console.debug('Scatter plot received the function for notifying color change')
    return this
  }

  console.debug('Finished creating scatter plot configurable function')
  return scatterPlot
}
