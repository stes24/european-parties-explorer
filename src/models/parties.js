class Parties {
  constructor () {
    this.entries = [] // All rows of the dataset
  }

  addEntry (entry) {
    if (entry.party_id === undefined) throw new Error('Entry with missing ID')
    this.entries.push(entry)
  }
}

export default new Parties()
