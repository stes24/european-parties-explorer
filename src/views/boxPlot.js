import * as d3 from 'd3'
import { TR_TIME } from '@/utils'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = [] // Only data of the given attribute
  let updateData

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 7, bottom: 10 }
  }
  let updateSize

  // It draws and can be configured (it is returned again when something changes)
  function boxPlot (wrapper) {
    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    const verticalLineGroup = wrapper.append('g')
    const boxGroup = wrapper.append('g')
    const horizontalLinesGroup = wrapper.append('g')

    // Draw box plot elements
    function dataJoin () {
      const sortedData = data.sort(d3.ascending)

      const stats = {
        q1: d3.quantile(sortedData, 0.25),
        median: d3.quantile(sortedData, 0.5),
        q3: d3.quantile(sortedData, 0.75),
        min: d3.min(sortedData),
        max: d3.max(sortedData)
      }
      const mid = dimensions.width / 2

      // Vertical line
      verticalLineGroup.selectAll('line')
        .data([stats])
        .join(
          enter => {
            return enter.append('line')
              .attr('class', 'boxPlot-line')
              .attr('x1', mid)
              .attr('x2', mid)
              .attr('y1', yScale(stats.min))
              .attr('y2', yScale(stats.max))
          },
          update => {
            return update
              .transition()
              .duration(TR_TIME)
              .attr('y1', d => yScale(d.min))
              .attr('y2', d => yScale(d.max))
          }
        )

      // Box
      boxGroup.selectAll('rect')
        .data([stats])
        .join(
          enter => {
            return enter.append('rect')
              .attr('class', 'box')
              .attr('x', 0)
              .attr('width', dimensions.width)
              .attr('y', yScale(stats.q3))
              .attr('height', yScale(stats.q1) - yScale(stats.q3))
          },
          update => {
            return update
              .transition()
              .duration(TR_TIME)
              .attr('y', yScale(stats.q3))
              .attr('height', yScale(stats.q1) - yScale(stats.q3))
          }
        )

      // Horizontal lines (min, median, max)
      horizontalLinesGroup.selectAll('line')
        .data([stats.min, stats.median, stats.max])
        .join(
          enter => {
            return enter.append('line')
              .attr('class', 'boxPlot-line')
              .attr('x1', 0)
              .attr('x2', dimensions.width)
              .attr('y1', d => yScale(d))
              .attr('y2', d => yScale(d))
          },
          update => {
            return update
              .transition()
              .duration(TR_TIME)
              .attr('y1', d => yScale(d))
              .attr('y2', d => yScale(d))
          }
        )
    }
    dataJoin()

    updateData = function () {
      dataJoin()
    }

    updateSize = function () {
      yScale.range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])
      dataJoin()
    }
  }

  boxPlot.data = function (_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return boxPlot
  }

  boxPlot.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return boxPlot
  }

  return boxPlot
}
