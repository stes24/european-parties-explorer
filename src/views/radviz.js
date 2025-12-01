// import { radviz } from 'd3-radviz'
import * as d3Radviz from 'd3-radviz'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData

  const dimensions = {
    width: null,
    height: null
  }
  let updateSize

  // d3-radviz instance
  let radvizInstance

  // Dimensions to use as radviz anchors
  // const radvizDimensions = ['spendvtax', 'immigrate_policy', 'environment', 'civlib_laworder', 'nationalism']
  const radvizDimensions = ['lrgen', 'lrecon', 'eu_position', 'eu_foreign']
  // const radvizDimensions = ['redistribution', 'spendvtax', 'deregulation']
  // const radvizDimensions = ['lrgen', 'lrecon', 'spendvtax', 'redistribution', 'deregulation'] // METTI LRECON ULTIMO

  // It draws and can be configured (it is returned again when something changes)
  function radvizPlot (containerDiv) {
    const wrapper = containerDiv.append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // radvizInstance = radviz()
    radvizInstance = d3Radviz.radviz()

    function draw () {
      if (data.length === 0) return
      // Filter data to include only the desired dimensions plus classification attributes
      // d3-radviz uses all numeric properties as dimensions, so we need to filter
      const filteredData = data.map(d => {
        const filtered = {
          // party_id: d.party_id, // Keep identifier
          // party: d.party, // Keep party name for tooltip
          // family: d.family // Keep for classification/coloring
        }
        // Add only the desired numeric dimensions
        radvizDimensions.forEach(dim => {
          filtered[dim] = d[dim]
        })
        return filtered
      })

      // Assign data and use effectiveness error heuristic
      radvizInstance.data(filteredData, 'family')
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
      draw()
    }

    updateSize = function () {
      draw()
    }

    console.debug('Finished drawing radviz')
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
