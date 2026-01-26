// import { radviz } from 'd3-radviz'
import * as d3 from 'd3'
import * as d3Radviz from 'd3-radviz'
import { attributes, factions, showTooltip, showFactionTooltip, moveTooltip, hideTooltip } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData
  let currentYear
  let lastDrawnYear = null // Track last drawn year to detect year changes
  let lastBrushActive = false // Track brush state to detect brush changes

  const dimensions = {
    width: null,
    height: null
  }
  let updateSize

  // d3-radviz instance
  let radvizInstance

  // Dimensions to use as radviz anchors
  let selectedDimensions = ['leftgen', 'rightgen', 'leftecon', 'rightecon']

  // Aggregation mode
  let aggregationMode = 'single' // 'single' or 'faction'

  // Local hover state for aggregated points (doesn't affect data model)
  let hoveredAggregatedPoint = null // Stores the party_id of hovered aggregated point

  // Hovering (single party)
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  // Batch hovering (multiple parties, for faction aggregation)
  let onBatchMouseEnter = _ => {}
  let onBatchMouseLeave = _ => {}

  // Dimension selection change callback
  let onDimensionChange = _ => {}

  // It draws and can be configured (it is returned again when something changes)
  function radvizPlot (containerDiv) {
    // Create left side container for controls and SVG
    const leftContainer = containerDiv.append('div')
      .attr('class', 'radviz-left-container')

    // Create buttons container on the right (full height)
    const buttonsContainer = containerDiv.append('div')
      .attr('class', 'radviz-buttons-container')

    // Create controls container at the top of left side
    const controlsContainer = leftContainer.append('div')
      .attr('class', 'radviz-controls')

    // Create label + dropdown for aggregation mode
    const pointsContainer = controlsContainer.append('div')
      .attr('class', 'radviz-points-container')

    pointsContainer.append('span')
      .attr('class', 'radviz-points-label')
      .text('Points:')

    const aggregationDropdown = pointsContainer.append('select')
      .attr('class', 'dropDown')
      .attr('id', 'radvizAggregationDropDown')

    aggregationDropdown.selectAll('option')
      .data([
        { value: 'single', label: 'Single parties' },
        { value: 'faction', label: 'Faction average' }
      ])
      .enter()
      .append('option')
      .attr('value', d => d.value)
      .text(d => d.label)

    // Add event listener for aggregation dropdown
    aggregationDropdown.on('change', function (event) {
      aggregationMode = event.target.value
      hoveredAggregatedPoint = null // Clear local hover state when changing mode
      draw()
    })

    // Get available attributes for current year
    let availableAttributes = Object.keys(attributes)
      .filter(a => attributes[a].goesOnRadviz && currentYear >= attributes[a].minYear)

    // Function to update buttons based on available attributes
    function updateButtons () {
      availableAttributes = Object.keys(attributes)
        .filter(a => attributes[a].goesOnRadviz && currentYear >= attributes[a].minYear)

      // Remove unavailable attributes from selection
      const previousLength = selectedDimensions.length
      selectedDimensions = selectedDimensions.filter(d => availableAttributes.includes(d))

      // Notify if dimensions changed due to year change
      if (previousLength !== selectedDimensions.length) {
        onDimensionChange(selectedDimensions)
      }

      buttonsContainer.selectAll('button')
        .data(availableAttributes, d => d)
        .join(
          enter => enter.append('button')
            .attr('class', 'radviz-button')
            .classed('active', d => selectedDimensions.includes(d))
            .text(d => attributes[d].name)
            .on('click', (event, d) => toggleDimension(d)),
          update => update
            .classed('active', d => selectedDimensions.includes(d)),
          exit => exit.remove()
        )
    }
    updateButtons()

    // Toggle dimension selection
    function toggleDimension (dimension) {
      if (selectedDimensions.includes(dimension)) {
        // Remove dimension if already selected
        selectedDimensions = selectedDimensions.filter(d => d !== dimension)
      } else {
        // Add dimension if not selected, but only if less than 4 are selected
        if (selectedDimensions.length < 4) {
          selectedDimensions = [...selectedDimensions, dimension]
        } else {
          // Do nothing if 4 are already selected
          return
        }
      }
      updateButtons()
      draw()
      onDimensionChange(selectedDimensions)
    }

    const wrapper = leftContainer.append('svg')
    radvizInstance = d3Radviz.radviz()
    // radvizInstance = radviz()

    // Helper function to aggregate data by faction
    function aggregateByFaction (data) {
      const factionGroups = d3.group(data, d => d.family)
      const aggregated = []

      factionGroups.forEach((parties, family) => {
        const aggregatedPoint = {
          faction_id: family,
          party_id: `faction_${family}`, // Unique identifier for this aggregation
          family,
          hovered: false, // Aggregated points never receive hover from individual parties
          brushed: false // Aggregated points never receive brush from individual parties
        }

        // First, compute average lrgen and lrecon if needed
        let avgLrgen = null
        let avgLrecon = null

        if (selectedDimensions.some(d => ['leftgen', 'rightgen'].includes(d))) {
          const validLrgen = parties.filter(p => p.lrgen != null && !isNaN(p.lrgen))
          if (validLrgen.length > 0) {
            avgLrgen = d3.mean(validLrgen, p => p.lrgen)
          }
        }

        if (selectedDimensions.some(d => ['leftecon', 'rightecon'].includes(d))) {
          const validLrecon = parties.filter(p => p.lrecon != null && !isNaN(p.lrecon))
          if (validLrecon.length > 0) {
            avgLrecon = d3.mean(validLrecon, p => p.lrecon)
          }
        }

        // Calculate values for each selected dimension
        selectedDimensions.forEach(dim => {
          // Handle left/right split dimensions specially
          if (dim === 'leftgen' && avgLrgen !== null) {
            aggregatedPoint[dim] = avgLrgen <= 0 ? -avgLrgen : 0
          } else if (dim === 'rightgen' && avgLrgen !== null) {
            aggregatedPoint[dim] = avgLrgen >= 0 ? avgLrgen : 0
          } else if (dim === 'leftecon' && avgLrecon !== null) {
            aggregatedPoint[dim] = avgLrecon <= 0 ? -avgLrecon : 0
          } else if (dim === 'rightecon' && avgLrecon !== null) {
            aggregatedPoint[dim] = avgLrecon >= 0 ? avgLrecon : 0
          } else {
            // For all other dimensions, compute average normally
            const validValues = parties.filter(p => p[dim] != null && !isNaN(p[dim]))
            if (validValues.length > 0) {
              aggregatedPoint[dim] = d3.mean(validValues, p => p[dim])
            }
          }
        })

        aggregated.push(aggregatedPoint)
      })

      return aggregated
    }

    // Helper function to find party data from radviz data point
    function findPartyFromData (d) {
      if (aggregationMode === 'single') {
        const partyId = d.attributes.party_id
        return data.find(p => p.party_id === partyId && p.year === currentYear)
      } else if (aggregationMode === 'faction') {
        // For faction aggregation, the point represents a faction
        const factionId = d.attributes.party_id.replace('faction_', '')
        const partyId = d.attributes.party_id
        return {
          party_id: partyId,
          family: parseInt(factionId),
          party: factions[parseInt(factionId)].name,
          hovered: hoveredAggregatedPoint === partyId, // Check local hover state
          brushed: false // Aggregated points never show brush state from data
        }
      }
    }

    // Function to customize the look of the points
    function colorPoints (selection) {
      // Check if any data is brushed (only relevant in single mode)
      const brushActive = aggregationMode === 'single' ? data.some(d => d.brushed) : false

      selection
        .attr('r', aggregationMode === 'single' ? 1.3 : 1.7) // Larger points for aggregated data
        .attr('class', d => {
          const party = findPartyFromData(d)
          if (party.brushed) return 'data_point circle-brushed'
          if (brushActive) return 'data_point circle-deselected'
          return 'data_point circle'
        })
        .style('fill', d => {
          const party = findPartyFromData(d)
          return party.hovered ? 'white' : factions[party.family].color
        })
        .style('opacity', d => {
          const party = findPartyFromData(d)
          return party.hovered ? 0.95 : (aggregationMode === 'single' ? null : 0.9)
        })
        .style('stroke-width', d => {
          const party = findPartyFromData(d)
          return party.brushed ? '0.5' : (aggregationMode === 'single' ? '0.3' : '0.4')
        })
        .style('stroke', d => {
          const party = findPartyFromData(d)
          return party.brushed ? 'red' : (aggregationMode === 'single' ? null : 'black')
        })
        .each(function (d) {
          const party = findPartyFromData(d)
          if (party.brushed) {
            d3.select(this).raise()
          }
        })

      raiseHoveredPoints(selection)
    }
    function raiseHoveredPoints (selection) { // Raise hovered only after raising all brushed
      selection.each(function (d) {
        const party = findPartyFromData(d)
        if (party.hovered) {
          d3.select(this).raise()
        }
      })
    }

    function draw () {
      // Update buttons for current year's available attributes
      updateButtons()

      // PREPARE DATA -------------------------

      if (data.length === 0 || selectedDimensions.length < 2) {
        // Clear the visualization if insufficient dimensions
        wrapper.selectAll('*').remove()
        lastDrawnYear = currentYear // Update tracking even when not drawing
        return
      }

      // Get data for current year
      const currentYearData = data.filter(d => d.year === currentYear)

      // Aggregate data based on selected mode
      let dataToVisualize = currentYearData
      if (aggregationMode === 'faction') {
        dataToVisualize = aggregateByFaction(currentYearData)
      }

      // Filter data to include only the desired dimensions plus classification attributes
      // d3-radviz uses all numeric properties as dimensions, so we need to filter
      const filteredData = dataToVisualize.map(d => {
        const filtered = {
          party_id: d.party_id // Keep identifier
        }
        // Add only the selected dimensions
        selectedDimensions.forEach(dim => {
          filtered[dim] = d[dim]
        })
        return filtered
      })

      // DRAW RADVIZ --------------------------

      // Assign data and use effectiveness error heuristic
      radvizInstance.data(filteredData, 'party_id')
      const eemhDA = d3Radviz.radvizDA.minEffectivenessErrorHeuristic(radvizInstance.data())
      radvizInstance.updateRadviz(eemhDA)

      // Disable anchors draggability
      radvizInstance.disableDraggableAnchors(true)

      // Clear previous content and draw
      wrapper.selectAll('*').remove()
      wrapper.call(radvizInstance)

      // CUSTOMIZE RADVIZ LOOK ----------------

      // Update anchor labels to use attribute names instead of attribute IDs
      wrapper.selectAll('text.anchor-points').each(function () {
        const name = attributes[this.textContent].name
        // Replace spaces with newlines by splitting into tspan elements
        const lines = name.split(' ')

        // Clear current text
        this.textContent = ''

        // Add each word as a separate tspan on a new line
        lines.forEach((line, i) => {
          const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
          tspan.textContent = line
          tspan.setAttribute('x', this.getAttribute('x'))
          tspan.setAttribute('dy', i === 0 ? 0 : '1em')
          this.appendChild(tspan)
        })
      })

      // Color points
      const points = wrapper.selectAll('.data_point')
      colorPoints(points)

      // Mouse handling
      points.on('mouseenter', function (event, d) {
        if (aggregationMode === 'single') {
          const party = findPartyFromData(d)
          onMouseEnter(party)
          showTooltip(event, party)
        } else if (aggregationMode === 'faction') {
          // Set local hover state for visual feedback
          hoveredAggregatedPoint = d.attributes.party_id
          colorPoints(wrapper.selectAll('.data_point'))

          // Hover all parties in this faction in other views
          const factionId = d.attributes.party_id.replace('faction_', '')
          const partiesInFaction = data.filter(p => p.family === parseInt(factionId) && p.year === currentYear)
          onBatchMouseEnter(partiesInFaction) // Pass array of parties (batch hover)
          // Show simple tooltip with just faction name
          showFactionTooltip(event, parseInt(factionId))
        }
      })
        .on('mousemove', (event) => {
          moveTooltip(event)
        })
        .on('mouseleave', function (event, d) {
          if (aggregationMode === 'single') {
            const party = findPartyFromData(d)
            onMouseLeave(party)
          } else if (aggregationMode === 'faction') {
            // Clear local hover state
            hoveredAggregatedPoint = null
            colorPoints(wrapper.selectAll('.data_point'))
            onBatchMouseLeave()
          }
          hideTooltip()
        })

      // Update last drawn year and brush state (only track brush in single mode)
      lastDrawnYear = currentYear
      lastBrushActive = aggregationMode === 'single' ? data.some(d => d.brushed) : false
    }
    draw()

    updateData = function () {
      // Redraw if year changed
      if (currentYear !== lastDrawnYear) {
        draw()
      } else if (aggregationMode === 'single') {
        // In single mode, respond to brush and hover changes
        const brushActive = data.some(d => d.brushed)
        if (brushActive !== lastBrushActive) {
          draw() // Redraw for brush changes (to update z-order)
        } else {
          // Update point styling for hover changes without full redraw
          colorPoints(wrapper.selectAll('.data_point'))
        }
      }
      // In aggregation mode, don't respond to individual party hover/brush from other views
    }

    updateSize = function () {
      wrapper.attr('width', dimensions.width)
        .attr('height', dimensions.height)
      draw()
    }

    console.debug('Finished drawing radviz')
  }

  radvizPlot.year = function (_) {
    if (!arguments.length) return currentYear
    currentYear = _
    return radvizPlot
  }
  radvizPlot.data = function (_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return radvizPlot
  }
  radvizPlot.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return radvizPlot
  }

  // Save the callbacks (update hovered property)
  radvizPlot.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }
  radvizPlot.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    console.debug('Radviz received the functions for updating the model on hover')
    return this
  }
  radvizPlot.bindBatchMouseEnter = function (callback) {
    onBatchMouseEnter = callback
    return this
  }
  radvizPlot.bindBatchMouseLeave = function (callback) {
    onBatchMouseLeave = callback
    console.debug('Radviz received the functions for batch hover')
    return this
  }
  radvizPlot.bindDimensionChange = function (callback) {
    onDimensionChange = callback
    console.debug('Radviz received the function for updating on dimension change')
    return this
  }

  // Getter for selected dimensions
  radvizPlot.getSelectedDimensions = function () {
    return selectedDimensions
  }

  console.debug('Finished creating radviz configurable function')
  return radvizPlot
}
