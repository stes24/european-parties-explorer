class Parties {
  constructor () {
    this.entries = [] // All rows of the dataset
    this.entriesById = {} // Maps party's id -> party's index(es) in entries ({ id1: [0, 12], id2: 1, ... })
    this.selectedYear = null
    this.onEntriesListChanged = () => {} // Function that updates the views (calls the data function on all views) (???)
    console.debug('Finished creating Parties model')
  }

  get entriesInYear () {
    return this.entries.filter(d => d.year === this.selectedYear)
  }

  // Called by the controller, which passes the callback (update views)
  bindEntriesListChanged (callback) {
    this.onEntriesListChanged = callback
    console.debug('Parties model received the function for updating views')
  }

  addEntry (entry) {
    if (entry.party_id === undefined) throw new Error('Entry with missing ID')

    this.entries.push(entry)
    if (!this.entriesById[entry.party_id]) this.entriesById[entry.party_id] = [] // More instances in multiple years
    this.entriesById[entry.party_id].push(this.entries.length - 1)
    this.onEntriesListChanged()
  }

  updateEntry (entry) {
    const entryIndex = this.entriesById[entry.party_id].find(i => this.entries[i].year === entry.year)

    this.entries[entryIndex] = { ...this.entries[entryIndex], ...entry } // Take the old entry and update the changed fields
    this.onEntriesListChanged()
  }

  /* deleteEntry (entryId) {
    const entryIndex = this.entriesById[entryId] // Retrieve entries index

    this.entries.splice(entryIndex, 1) // Remove the party at said index
    delete this.entriesById[entryId] // Remove in entriesById
    this.entries.forEach(e => { // Update index for successive entries (-1)
      if (this.entriesById[e.party_id] > entryIndex) this.entriesById[e.id] -= 1
    })
    this.onEntriesListChanged()
  } */

  setYear (year) {
    this.selectedYear = year
    this.onEntriesListChanged()
  }
}

export default new Parties()
