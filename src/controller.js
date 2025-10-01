import models from './models' // Object in the form {parties: [instance of class Parties]}
import views from './views'

class Controller {
  constructor () {
    // Models
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries)
    // Views
    this.views = ['scatterPlot'] /*, 'lineChart', 'parallelCoordinates' */
    this[this.views[0]] = views.scatterPlot()
    // this[this.views[1]] = views.lineChart()
    // this[this.views[2]] = views.parallelCoordinates()

    // Models functions binding (tell the model how to update the views (???))
    this.parties.bindEntriesListChanged(this.onPartiesListChanged.bind(this))
    // Views functions binding
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

  // Will be passed to the models so that they know how to update the views (???)
  onPartiesListChanged () {
    this.views.forEach(v => { this[v].data(this.parties.entries) })
  }
}

export default new Controller()
