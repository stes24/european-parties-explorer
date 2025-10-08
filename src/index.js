import './index.scss'
import 'normalize.css'
import * as d3 from 'd3'
import controller from './controller' // Already an instance of the class
import { formatParty } from './utils'

async function init () {
  await loadData()

  // Override normalize's behavior
  document.body.style.margin = '3px'

  // Create views
  const views = ['scatterPlot', 'lineChart', 'parallelCoordinates']
  views.forEach(v => {
    const container = d3.select('#root').append('div')
      .attr('class', 'container')
      .attr('id', `${v}-container`)
    const { width, height } = container.node().getBoundingClientRect()
    controller[v].size(width, height) // SWAP???
    container.call(controller[v]) // Call the appropriate drawing function on the current container
  })

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
  let data

  try {
    data = await d3.csv('./assets/merged_dataset_with_mds.csv') // Remote execution (dist)
    console.debug(`Data loaded from assets (${data.length} rows)`)
    formatData(data)
  } catch (e) {
    try {
      data = await d3.csv('./merged_dataset_with_mds.csv') // Local execution
      console.debug(`Data loaded from public (${data.length} rows)`)
      formatData(data)
    } catch (e) {
      console.error('Error loading data\n', e)
    }
  }
}

function formatData (data) { // Create Party objects and add them to the model (through the controller)
  for (let i = 0; i < data.length; i++) {
    const party = formatParty(data[i])
    controller.handleAddParty(party)
  }
  controller.setYear(2024) // Default year
}

init()
