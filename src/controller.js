import models from './models' // Object in the form {parties: [instance of class Parties]}
import views from './views' // Object containing factory functions

class Controller {
  constructor () {
    // Models
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries)

    // Views (call the external functions, which assign the drawing functions to the following variables)
    this.scatterPlot = views.scatterPlot()
    this.lineChart = views.lineChart()
    this.parallelCoordinates = views.parallelCoordinates()

    // Models functions binding (pass to the models the function that updates the views) (???)
    this.parties.bindEntriesListChanged(this.onPartiesListChanged.bind(this))
    // Views functions binding
    this.scatterPlot.bindMouseEnter(p => this.handleMouseEnter(p)).bind(this)
    this.scatterPlot.bindMouseLeave(p => this.handleMouseLeave(p)).bind(this)

    console.debug('Finished creating controller')
  }

  handleAddParty (party) {
    this.parties.addEntry(party)
  }

  handleUpdateParty (party) {
    this.parties.updateEntry(party)
  }

  /* handleDeleteParty (party) { // id?
    this.parties.deleteEntry(party)
  } */

  setYear (year) {
    this.parties.setYear(year)
  }

  // Passed to the views so that they're called on hover -> the model updates the entry
  handleMouseEnter (party) {
    this.handleUpdateParty({ party_id: party.party_id, year: party.year, hovered: true })
  }

  handleMouseLeave (party) {
    this.handleUpdateParty({ party_id: party.party_id, year: party.year, hovered: false })
  }

  // Passed to the models so that it is called whenever there's an update -> data calls the drawing function of the relative view (???)
  onPartiesListChanged () {
    const entries = this.parties.entries
    const entriesInYear = this.parties.entriesInYear

    this.scatterPlot.data(entriesInYear)
    this.lineChart.data(entries)
    this.parallelCoordinates.data(entriesInYear)
  }
}

export default new Controller()
