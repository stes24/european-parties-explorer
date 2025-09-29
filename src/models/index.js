import parties from './parties' // Import instance of class Parties

export default { parties } // Export the instance as property of a new object (no class)
// This trick is done because there could be more models; this way, "models" becomes a container of all instances
