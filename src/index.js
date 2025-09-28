import './index.scss'
import * as d3 from 'd3'

async function init () {
  await loadData()
}

async function loadData () {
  try {
    const data = await d3.csv('./merged_dataset_with_mds.csv')
    console.debug(`Data loaded (${data.length} rows)`)
  } catch (e) {
    console.error('Error loading data\n', e)
  }
}

init()
