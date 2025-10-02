export default function () {
  function parallelCoordinates () {
    console.debug('Finished drawing parallel coordinates')
  }

  // Update functions - called when something changes, they draw again the views
  parallelCoordinates.data = function (_) {
    // if (!arguments.length) return data
    // data = _
    return parallelCoordinates
  }

  console.debug('Finished creating parallel coordinates configurable function')
  return parallelCoordinates
}
