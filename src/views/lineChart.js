import * as d3 from 'd3'

export default function () {
  let data = []

  const dimensions = {
    width: 800,
    height: 350,
    margin: { top: 35, right: 25, bottom: 40, left: 35 }
  }
  let updateSize

  function lineChart (containerDiv) {
    console.debug('Finished drawing line chart')
  }

  lineChart.data = function (_) {
    if (!arguments.length) return lineChart
    data = _
    return lineChart
  }
  lineChart.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return lineChart
  }

  console.debug('Finished creating line chart configurable function')
  return lineChart
}
