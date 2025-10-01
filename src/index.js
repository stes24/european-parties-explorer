import './index.scss'
import 'normalize.css'
import * as d3 from 'd3'
import controller from './controller' // Already an instance of the class
import { formatParty } from './utils'

async function init () {
  await loadData()

  const container = d3.select('#root').append('div')
  const views = ['scatterPlot']
  container.call(controller[views[0]])
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
}

init()
