class Parties {
  constructor () {
    this.entries = [] // All rows of the dataset
    this.entriesById = {} // Maps party's id -> party's index in entries ({ id1: 0, id2: 1, ... })
    this.onEntriesListChanged = () => {} // Callback that updates the views (???)
  }

  // Called by the controller, which passes the callback
  bindEntriesListChanged (callback) {
    this.onEntriesListChanged = callback
  }

  addEntry (entry) {
    if (entry.party_id === undefined) throw new Error('Entry with missing ID')

    this.entries.push(entry)
    this.entriesById[entry.party_id] = this.entries.length - 1 // Where the newly added party is located in entries (index)
    this.onEntriesListChanged()
  }

  updateEntry (entry) {
    const entryIndex = this.entriesById[entry.party_id] // Retrieve entries index

    this.entries[entryIndex] = { ...this.entries[entryIndex], ...entry } // Take the old entry and update the changed fields
    this.onEntriesListChanged()
  }

  deleteEntry (entryId) {
    const entryIndex = this.entriesById[entryId] // Retrieve entries index

    this.entries.splice(entryIndex, 1) // Remove the party at said index
    delete this.entriesById[entryId] // Remove in entriesById
    this.entries.forEach(e => { // Update index for successive entries (-1)
      if (this.entriesById[e.party_id] > entryIndex) this.entriesById[e.id] -= 1
    })
    this.onEntriesListChanged()
  }
}

export default new Parties()
