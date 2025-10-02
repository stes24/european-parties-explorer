import models from './models' // Object in the form {parties: [instance of class Parties]}
import views from './views' // Object containing factory functions

class Controller {
  constructor () {
    // Models
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries)
    // Views
    this.views = ['scatterPlot'] /*, 'lineChart', 'parallelCoordinates' */
    // Call the external functions, which assign the drawing functions to the following variables
    this[this.views[0]] = views.scatterPlot()
    // this[this.views[1]] = views.lineChart()
    // this[this.views[2]] = views.parallelCoordinates()

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
    this.views.forEach(v => {
      this[v].data(this.parties.entries)
    })
  }
}

export default new Controller()
