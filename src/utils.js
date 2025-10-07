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

export const TR_TIME = 1000 // TEMPORARY

export const years = [1999, 2002, 2006, 2010, 2014, 2019, 2024]

export const attributes = { // Reordered so that similar topics are close
  family: 'Political faction',
  country: 'Country',
  lrgen: 'Left/right',
  lrecon: 'Economic left/right',
  spendvtax: 'Spending vs. reducing taxes',
  redistribution: 'Wealth redistribution',
  deregulation: 'Market deregulation',
  eu_position: 'European Union',
  eu_intmark: 'EU internal market',
  eu_foreign: 'EU foreign policy',
  immigrate_policy: 'Immigration policies',
  multiculturalism: 'Multiculturalism',
  ethnic_minorities: 'Ethnic minorities',
  nationalism: 'Nationalism',
  civlib_laworder: 'Civil liberties vs. law & order',
  sociallifestyle: 'Social lifestyle',
  religious_principles: 'Religious principles',
  environment: 'Environment',
  regions: 'Regionalism'
}

export const countries = {
  1: 'Belgium',
  2: 'Denmark',
  3: 'Germany',
  4: 'Greece',
  5: 'Spain',
  6: 'France',
  7: 'Ireland',
  8: 'Italy',
  10: 'Netherlands',
  11: 'UK',
  12: 'Portgual',
  13: 'Austria',
  14: 'Finland',
  16: 'Sweden',
  20: 'Bulgaria',
  21: 'Czechia',
  22: 'Estonia',
  23: 'Hungary',
  24: 'Latvia',
  25: 'Lithuania',
  26: 'Poland',
  27: 'Romania',
  28: 'Slovakia',
  29: 'Slovenia',
  31: 'Croatia',
  40: 'Cyprus'
}

export const factions = {
  1: 'Radical Right',
  2: 'Conservatives',
  3: 'Liberal',
  4: 'Christian-Democratic',
  5: 'Socialist',
  6: 'Radical Left',
  7: 'Green',
  8: 'Regionalist',
  9: 'No faction',
  10: 'Confessional',
  11: 'Agrarian/Center'
}

export const factionsColors = {
  1: '#1F77B4', 2: '#AEC7E8', 3: '#BCBD22', 4: '#9467BD', 5: '#FF9896', 6: '#D62728', 7: '#2CA02C', 8: '#8C564B', 9: '#7F7F7F', 10: '#E377C2', 11: '#FF7F0E'
}
