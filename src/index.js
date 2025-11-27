import './index.scss'
import 'normalize.css'
import * as d3 from 'd3'
import controller from './controller' // Already an instance of the class
import { formatParty, years } from './utils'

async function init () {
  await loadData()

  // Override normalize's behavior
  document.body.style.margin = '3px'

  // Create views
  const views = ['scatterPlot', 'radviz', 'lineChart', 'parallelCoordinates']
  views.forEach(v => {
    const container = d3.select('#root').append('div')
      .attr('class', 'container')
      .attr('id', `${v}-container`)
    const { width, height } = container.node().getBoundingClientRect()
    controller[v].size(width, height)
    container.call(controller[v]) // Call the appropriate drawing function on the current container
  })

  // Tooltip
  d3.select('#root').append('div').attr('id', 'tooltip')

  // Resize listener
  window.addEventListener('resize', _ => {
    views.forEach(v => {
      const container = d3.select(`#${v}-container`)
      const { width, height } = container.node().getBoundingClientRect()
      controller[v].size(width, height)
    })
  })
  console.debug('Finished creating resize listener')
}

async function loadData () {
  try {
    const data = await d3.csv('./dataset_final_with_mds.csv') // Load from public
    console.debug(`Loaded data (${data.length} rows)`)
    for (let i = 0; i < data.length; i++) { // Create Party objects and add them to the model (through the controller)
      const party = formatParty(data[i])
      controller.handleAddParty(party)
    }
    controller.setYear(years.at(-1)) // Default year (most recent)
  } catch (e) {
    console.error('Error loading data\n', e)
  }
}

init()
