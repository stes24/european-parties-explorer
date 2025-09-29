import './index.scss'
import 'normalize.css'
import * as d3 from 'd3'
import { formatParty } from './utils'

async function init () {
  await loadData()
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

function formatData (data) {
  for (let i = 0; i < data.length; i++) {
    const party = formatParty(data[i])
  }
}

init()
