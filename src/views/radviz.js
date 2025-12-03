// import { radviz } from 'd3-radviz'
import * as d3Radviz from 'd3-radviz'
import { attributes } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData
  let currentYear

  const dimensions = {
    width: null,
    height: null
  }
  let updateSize

  // d3-radviz instance
  let radvizInstance

  // Dimensions to use as radviz anchors
  let selectedDimensions = ['eu_position', 'eu_intmark', 'eu_foreign']

  // It draws and can be configured (it is returned again when something changes)
  function radvizPlot (containerDiv) {
    // Get available attributes for current year
    let availableAttributes = Object.keys(attributes)
      .filter(a => attributes[a].goesOnRadviz && currentYear >= attributes[a].minYear)

    // Create buttons container on the right
    const buttonsContainer = containerDiv.append('div')
      .attr('class', 'radviz-buttons-container')

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

    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width - dimensions.buttonsWidth)
      .attr('height', dimensions.height)

    // radvizInstance = radviz()
    radvizInstance = d3Radviz.radviz()

    function draw () {
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

      // Assign data and use effectiveness error heuristic
      radvizInstance.data(filteredData, 'party_id')
      const eemhDA = d3Radviz.radvizDA.minEffectivenessErrorHeuristic(radvizInstance.data())
      radvizInstance.updateRadviz(eemhDA)

      // Disable anchors draggability
      radvizInstance.disableDraggableAnchors(true)

      // Clear previous content and draw
      wrapper.selectAll('*').remove()
      wrapper.call(radvizInstance)

      // Set background
      wrapper.select('circle').style('fill', 'black')
    }
    draw()

    updateData = function () {
      updateButtons()
      draw()
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

  console.debug('Finished creating radviz configurable function')
  return radvizPlot
}
