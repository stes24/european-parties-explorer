import models from './models' // Object in the form {parties: [instance of class Parties]}
import views from './views' // Object containing factory functions

class Controller {
  constructor () {
    // Models
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries and the class' methods)

    // Views (call the external functions, which assign the drawing functions to the following variables)
    this.scatterPlot = views.scatterPlot()
    this.radviz = views.radviz()
    this.lineChart = views.lineChart()
    this.parallelCoordinates = views.parallelCoordinates()

    // Save brush from each view
    this.brushes = {
      scatterPlot: null,
      parallelCoordinates: null
    }

    // Models functions binding (pass to the models the function that updates the views)
    this.parties.bindEntriesListChanged(this.onPartiesListChanged.bind(this)) // Called using the controller's "this" context
    // Views functions binding (pass to the views the functions that let the model update parties)
    this.scatterPlot.bindMouseEnter(p => this.handleMouseEnter(p)).bind(this)
    this.scatterPlot.bindMouseLeave(p => this.handleMouseLeave(p)).bind(this)
    this.scatterPlot.bindBrush((p, v) => this.handleBrush(p, v)).bind(this)
    this.parallelCoordinates.bindMouseEnter(p => this.handleMouseEnter(p)).bind(this)
    this.parallelCoordinates.bindMouseLeave(p => this.handleMouseLeave(p)).bind(this)
    this.parallelCoordinates.bindBrush((p, v) => this.handleBrush(p, v)).bind(this)
    this.parallelCoordinates.bindBoxPlotMouseEnter(p => this.handleBatchMouseEnter(p)).bind(this)
    this.parallelCoordinates.bindBoxPlotMouseLeave(() => this.handleBatchMouseLeave()).bind(this)
    // Pass the function that sets the selected year
    this.lineChart.bindYearChange(year => this.setYear(year)).bind(this)

    console.debug('Finished creating controller')
  }

  handleAddParty (party) {
    this.parties.addEntry(party)
  }

  handleUpdateParty (party) {
    this.parties.updateEntry(party)
  }

  setYear (year) {
    // Notify views that need year for drawing
    this.lineChart.year(year)
    this.parallelCoordinates.year(year)

    // Update model and redraw views
    this.parties.setYear(year)
  }

  getYear () {
    return this.parties.year
  }

  // Passed to the views so that they're called on hover -> the model updates the hovered entry
  handleMouseEnter (party) {
    this.handleUpdateParty({ party_id: party.party_id, year: party.year, hovered: true })
  }

  handleMouseLeave (party) {
    this.handleUpdateParty({ party_id: party.party_id, year: party.year, hovered: false })
  }

  // Batch hover handlers for hovering multiple parties at once (box plots)
  handleBatchMouseEnter (parties) {
    const partyIds = new Set(parties.map(p => p.party_id))
    this.parties.setBatchHover(partyIds)
  }

  handleBatchMouseLeave () {
    this.parties.setBatchHover(null)
  }

  handleBrush (ids, view) {
    // Associate brush to the view it comes from
    this.brushes[view] = ids
    // Non null brushes (active brushes)
    const activeBrushes = Object.values(this.brushes).filter(b => b && b.size > 0)

    let intersection
    if (activeBrushes.length === 0) { // No brushes
      intersection = null
    } else { // Intersection among all brushes
      intersection = activeBrushes.reduce((acc, s) => new Set([...acc].filter(x => s.has(x)))) // Accumulated set intersection current set
    }

    this.parties.setBrush(intersection)
  }

  // Passed to the models so that it is called whenever there's an update -> data calls the drawing function of the relative view
  onPartiesListChanged () {
    const entries = this.parties.entries
    const entriesInYear = this.parties.entriesInYear

    this.scatterPlot.data(entriesInYear)
    this.radviz.data(entriesInYear)
    this.lineChart.data(entries)
    this.parallelCoordinates.data(entriesInYear)
  }
}

export default new Controller()
