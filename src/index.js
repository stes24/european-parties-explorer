import './index.scss'
import 'normalize.css'
import * as d3 from 'd3'

async function init () {
  await loadData()
}

async function loadData () {
  try {
    const data = await d3.csv('./assets/merged_dataset_with_mds.csv') // Remote execution (dist)
    console.debug(`Data loaded from assets (${data.length} rows)`)
  } catch (e) {
    try {
      const data = await d3.csv('./merged_dataset_with_mds.csv') // Local execution
      console.debug(`Data loaded from public (${data.length} rows)`)
    } catch (e) {
      console.error('Error loading data\n', e)
    }
  }
}

init()
