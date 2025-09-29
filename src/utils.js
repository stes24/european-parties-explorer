export function formatParty (row) { // For each csv row, return an object (Party)
  if (row.party_id === undefined) throw new Error('Party with missing ID')

  return {
    country: parseInt(row.country),
    year: parseInt(row.year),
    party_id: parseInt(row.party_id),
    party: row.party,
    vote: parseFloat(row.vote),
    epvote: parseFloat(row.epvote),
    family: parseInt(row.family),
    eu_position: parseFloat(row.eu_position),
    eu_intmark: parseFloat(row.eu_intmark),
    eu_foreign: parseFloat(row.eu_foreign),
    lrgen: parseFloat(row.lrgen),
    lrecon: parseFloat(row.lrecon),
    spendvtax: parseFloat(row.spendvtax),
    deregulation: parseFloat(row.deregulation),
    redistribution: parseFloat(row.redistribution),
    civlib_laworder: parseFloat(row.civlib_laworder),
    sociallifestyle: parseFloat(row.sociallifestyle),
    religious_principles: parseFloat(row.religious_principles),
    immigrate_policy: parseFloat(row.immigrate_policy),
    multiculturalism: parseFloat(row.multiculturalism),
    environment: parseFloat(row.environment),
    regions: parseFloat(row.regions),
    ethnic_minorities: parseFloat(row.ethnic_minorities),
    nationalism: parseFloat(row.nationalism),
    mds1: parseFloat(row.mds1),
    mds2: parseFloat(row.mds2)
  }
}
