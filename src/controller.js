import models from './models' // Object in the form {parties: [instance of class Parties]}

class Controller {
  constructor () {
    // Model
    this.parties = models.parties // Property of the imported obejct = instance of Parties (= data entries)
  }

  handleAddParty (party) {
    this.parties.addEntry(party)
  }
}

export default new Controller()
