import * as d3 from 'd3'

// Configurable function - it returns a new function (which, when called, draws the view)
export default function () {
  let data = []
  let updateData
  let currentAttribute // Which attribute this box plot is referring to
  let brushedOnly = false // If true, only show brushed data
  let skipTransition = false // If true, skip transitions (used during active brushing)

  const dimensions = {
    width: null,
    height: null,
    margin: { top: 10, bottom: 10 },
    axisMargin: 3 // Space between axis and box plot
  }
  let updateSize

  // Hovering
  let onMouseEnter = _ => {}
  let onMouseLeave = _ => {}

  const TR_TIME = 1500

  // Helper to get transition duration
  const getTransitionDuration = () => (brushedOnly && skipTransition) ? 0 : TR_TIME

  // It draws and can be configured (it is returned again when something changes)
  function boxPlot (wrapper) {
    const yScale = d3.scaleLinear()
      .domain(currentAttribute === 'lrgen' || currentAttribute === 'lrecon' ? [-5, 5] : [0, 10])
      .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

    const axisGroup = wrapper.append('g')
      .attr('class', 'axis')

    const verticalLineGroup = wrapper.append('g')
      .attr('transform', `translate(${dimensions.axisMargin}, 0)`)
    const boxGroup = wrapper.append('g')
      .attr('transform', `translate(${dimensions.axisMargin}, 0)`)
    const horizontalLinesGroup = wrapper.append('g')
      .attr('transform', `translate(${dimensions.axisMargin}, 0)`)
    const hoverRegionsGroup = wrapper.append('g')
      .attr('transform', `translate(${dimensions.axisMargin}, 0)`)

    // Draw box plot elements
    function dataJoin () {
      // Filter data if showing brushed only
      const filteredData = brushedOnly ? data.filter(d => d.brushed) : data

      // If no data to show, hide all elements
      if (filteredData.length === 0) {
        verticalLineGroup.selectAll('line').remove()
        boxGroup.selectAll('rect').remove()
        horizontalLinesGroup.selectAll('line').remove()
        hoverRegionsGroup.selectAll('rect.hover-region').remove()
        return
      }

      const sortedData = filteredData
        .map(d => d[currentAttribute])
        .sort(d3.ascending)

      const stats = {
        q1: d3.quantile(sortedData, 0.25),
        median: d3.quantile(sortedData, 0.5),
        q3: d3.quantile(sortedData, 0.75),
        min: d3.min(sortedData),
        max: d3.max(sortedData)
      }
      const mid = dimensions.width / 2
      const boxClass = brushedOnly ? 'box-brushed' : 'box'

      // Axis (only show for non-brushed box plot)
      if (!brushedOnly) {
        const axis = d3.axisLeft(yScale)
          .ticks(3)
          .tickFormat(() => '') // Remove tick labels
        axisGroup.call(axis)
      } else {
        axisGroup.selectAll('*').remove() // Hide axis for brushed box plot
      }

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
              .duration(getTransitionDuration())
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
              .attr('class', boxClass)
              .attr('x', 0)
              .attr('y', yScale(stats.q3))
              .attr('width', dimensions.width)
              .attr('height', yScale(stats.q1) - yScale(stats.q3))
          },
          update => {
            return update
              .attr('class', boxClass)
              .transition()
              .duration(getTransitionDuration())
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
              .duration(getTransitionDuration())
              .attr('y1', d => yScale(d))
              .attr('y2', d => yScale(d))
          }
        )

      // Hover regions (one for each quartile range)
      const hoverRegions = [
        { range: [stats.min, stats.q1], name: 'Q0-Q1' },
        { range: [stats.q1, stats.median], name: 'Q1-Q2' },
        { range: [stats.median, stats.q3], name: 'Q2-Q3' },
        { range: [stats.q3, stats.max], name: 'Q3-Q4' }
      ]

      let hoveredParties = [] // Track currently hovered parties

      hoverRegionsGroup.selectAll('rect.hover-region')
        .data(hoverRegions, d => d.name)
        .join(
          enter => {
            return enter.append('rect')
              .attr('class', 'hover-region')
              .attr('x', 0)
              .attr('y', d => yScale(d.range[1]))
              .attr('width', dimensions.width)
              .attr('height', d => yScale(d.range[0]) - yScale(d.range[1]))
              .style('fill', 'transparent')
              .on('mouseenter', (event, d) => {
                // Find all parties whose attribute value falls in this range
                // Use filteredData so we only hover parties shown in this box plot
                hoveredParties = filteredData.filter(party => {
                  const value = party[currentAttribute]
                  return d.range[0] <= value && value <= d.range[1]
                })
                // Hover all parties in this quartile at once
                onMouseEnter(hoveredParties)
              })
              .on('mouseleave', () => {
                onMouseLeave()
                hoveredParties = []
              })
          },
          update => {
            return update
              .attr('y', d => yScale(d.range[1]))
              .attr('height', d => yScale(d.range[0]) - yScale(d.range[1]))
              .on('mouseenter', (event, d) => {
                // Update hover handler to use current filteredData
                hoveredParties = filteredData.filter(party => {
                  const value = party[currentAttribute]
                  return d.range[0] <= value && value <= d.range[1]
                })
                onMouseEnter(hoveredParties)
              })
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

  boxPlot.attribute = function (_) {
    if (!arguments.length) return currentAttribute
    currentAttribute = _
    return boxPlot
  }

  boxPlot.size = function (width, height) {
    if (!arguments.length) return [dimensions.width, dimensions.height]
    dimensions.width = width
    dimensions.height = height
    if (typeof updateSize === 'function') updateSize()
    return boxPlot
  }

  // Save the callbacks (hover multiple parties at once)
  boxPlot.bindMouseEnter = function (callback) {
    onMouseEnter = callback
    return this
  }

  boxPlot.bindMouseLeave = function (callback) {
    onMouseLeave = callback
    return this
  }

  boxPlot.brushedOnly = function (_) {
    if (!arguments.length) return brushedOnly
    brushedOnly = _
    return boxPlot
  }

  boxPlot.skipTransition = function (_) {
    if (!arguments.length) return skipTransition
    skipTransition = _
    return boxPlot
  }

  return boxPlot
}
