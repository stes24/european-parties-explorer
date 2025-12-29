// import { radviz } from 'd3-radviz'
import * as d3 from 'd3'
import * as d3Radviz from 'd3-radviz'
import { attributes, factions, showTooltip, moveTooltip, hideTooltip } from '@/utils'

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

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

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
        { value: 'faction', label: 'Faction average' },
        { value: 'country', label: 'Country average' }
      ])
      .enter()
      .append('option')
      .attr('value', d => d.value)
      .text(d => d.label)

    // Get available attributes for current year
    let availableAttributes = Object.keys(attributes)
      .filter(a => attributes[a].goesOnRadviz && currentYear >= attributes[a].minYear)

    // Function to update buttons based on available attributes
    function updateButtons () {
      availableAttributes = Object.keys(attributes)
        .filter(a => attributes[a].goesOnRadviz && currentYear >= attributes[a].minYear)

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
        // Add dimension if not selected
        selectedDimensions = [...selectedDimensions, dimension]
      }
      updateButtons()
      draw()
    }

    const wrapper = leftContainer.append('svg')
    radvizInstance = d3Radviz.radviz()
    // radvizInstance = radviz()

    // Helper function to find party data from radviz data point
    function findPartyFromData (d) {
      const partyId = d.attributes.party_id
      return data.find(p => p.party_id === partyId && p.year === currentYear)
    }

    // Function to customize the look of the points
    function colorPoints (selection) {
      // Check if any data is brushed
      const brushActive = data.some(d => d.brushed)

      selection
        .attr('r', 1.3)
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
          return party.hovered ? 0.95 : null
        })
        .style('stroke-width', d => {
          const party = findPartyFromData(d)
          return party.brushed ? '0.4' : '0.3'
        })
        .style('stroke', d => {
          const party = findPartyFromData(d)
          return party.brushed ? 'red' : null
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
      // PREPARE DATA -------------------------

      if (data.length === 0 || selectedDimensions.length < 2) return
      // Filter data to include only the desired dimensions plus classification attributes
      // d3-radviz uses all numeric properties as dimensions, so we need to filter
      const filteredData = data.map(d => {
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
        const party = findPartyFromData(d)
        onMouseEnter(party)
        showTooltip(event, party)
      })
        .on('mousemove', (event) => {
          moveTooltip(event)
        })
        .on('mouseleave', function (event, d) {
          const party = findPartyFromData(d)
          onMouseLeave(party)
          hideTooltip()
        })

      // Update last drawn year and brush state
      lastDrawnYear = currentYear
      lastBrushActive = data.some(d => d.brushed)
    }
    draw()

    updateData = function () {
      const brushActive = data.some(d => d.brushed)

      // Redraw if year changed or brush state changed (to update z-order)
      if (currentYear !== lastDrawnYear || brushActive !== lastBrushActive) {
        updateButtons() // Update available buttons for new year
        draw()
      } else {
        // Update point styling for hover changes without full redraw
        colorPoints(wrapper.selectAll('.data_point'))
      }
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

  console.debug('Finished creating radviz configurable function')
  return radvizPlot
}
