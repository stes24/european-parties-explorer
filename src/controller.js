import models from './models' // Object in the form {parties: [instance of class Parties]}
import views from './views' // Object containing factory functions

class Controller {
  constructor () {
    // Models
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries)

    // Views (call the external functions, which assign the drawing functions to the following variables)
    this.scatterPlot = views.scatterPlot()
    this.parallelCoordinates = views.parallelCoordinates()

    // Models functions binding (pass the function that updates the views to the models) (???)
    this.parties.bindEntriesListChanged(this.onPartiesListChanged.bind(this))
    // Views functions binding

    console.debug('Finished creating controller')
  }

  handleAddParty (party) {
    this.parties.addEntry(party)
  }

  handleUpdateParty (party) {
    this.parties.updateEntry(party)
  }

  handleDeleteParty (party) { // id?
    this.parties.deleteEntry(party)
  }

  // Passed to the models so that it is called whenever there's an update -> data calls the drawing function of the relative view (???)
  onPartiesListChanged () {
    const entries = this.parties.entries
    this.scatterPlot.data(entries)
    this.parallelCoordinates.data(entries)
  }
}

export default new Controller()
