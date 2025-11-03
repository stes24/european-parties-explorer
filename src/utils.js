import * as d3 from 'd3'

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
    mds2: parseFloat(row.mds2),
    hovered: false
  }
}

export const TR_TIME = 1000 // TEMPORARY

export const years = [1999, 2002, 2006, 2010, 2014, 2019, 2024]

// id: [displayed name, goes on line chart, goes on parallel coordinates, description]
export const attributes = { // Reordered so that similar topics are close
  family: ['Political faction', false, true, 'Parties\' political<br>faction in '],
  country: ['Country', false, true, 'Parties\' country of origin'],
  vote: ['Votes in the most recent national election (%)', true, false, 'Vote percentage received by<br>the parties in the national election<br>most prior to the given year'],
  epvote: ['Votes in the most recent European election (%)', true, false, 'Vote percentage received by the<br>parties in the European Parliament<br>election most prior to the given year'],
  lrgen: ['Left/right', true, true, 'Overall ideological stance<br>0 = extreme left<br>5 = center<br>10 = extreme right'],
  lrecon: ['Economic left/right', true, true, 'Ideological stance on economic issues<br>0 = extreme left<br>5 = center<br>10 = extreme right'],
  spendvtax: ['Spending vs. reducing taxes', true, true, 'Improving public services vs. reducing taxes<br>0 = strongly favors reducing taxes<br>10 = strongly favors improving public services'],
  redistribution: ['Wealth redistribution', true, true, 'Redistribution of wealth from the rich to the poor<br>0 = strongly opposes redistribution<br>10 = strongly favors redistribution'],
  deregulation: ['Market deregulation', true, true, 'Deregulations of markets<br>0 = strongly opposes deregulation<br>10 = strongly favors deregulation'],
  eu_position: ['European Union', true, true, 'European integration<br>1 = strongly opposed<br>2 = opposed<br>3 = somewhat opposed<br>4 = neutral<br>5 = somewhat in favor<br>6 = in favor<br>7 = strongly in favor'],
  eu_intmark: ['EU internal market', true, true, 'Internal market (free movement of goods, services, etc.)<br>1 = strongly opposed<br>2 = opposed<br>3 = somewhat opposed<br>4 = neutral<br>5 = somewhat in favor<br>6 = in favor<br>7 = strongly in favor'],
  eu_foreign: ['EU foreign policy', true, true, 'EU foreign and security policy<br>1 = strongly opposed<br>2 = opposed<br>3 = somewhat opposed<br>4 = neutral<br>5 = somewhat in favor<br>6 = in favor<br>7 = strongly in favor'],
  immigrate_policy: ['Immigration policies', true, true, 'Immigration policies<br>0 = strongly favors restrictive policies<br>10 = strongly favors liberal policies'],
  multiculturalism: ['Multiculturalism', true, true, 'Integration of immigrants and asylum seekers<br>0 = strongly favors assimilation<br>10 = strongly favors multiculturalism'],
  ethnic_minorities: ['Ethnic minorities', true, true, 'Rights for ethnic minorities<br>0 = strongly opposes more rights<br>10 = strongly favors more rights'],
  nationalism: ['Nationalism', true, true, 'Cosmopolitanism vs. nationalism<br>0 = Strongly favors a cosmopolitan society<br>10 = Strongly favors a nationalist society'],
  civlib_laworder: ['Civil liberties vs. law & order', true, true, 'Civil liberties vs. law & order<br>0 = strongly favors civil liberties<br>10 = strongly favors tough measures to fight crime'],
  sociallifestyle: ['Social lifestyle', true, true, 'LGBT rights, gender equality, etc.<br>0 = strongly opposes liberal policies<br>10 = strongly favors liberal policies'],
  religious_principles: ['Religious principles', true, true, 'Role of religious principles in politics<br>0 = strongly opposes religion in politics<br>10 = strongly favors religion in politics'],
  environment: ['Environment', true, true, 'Environmental sustainability<br>0 = strongly favors economic growth at the cost of environment protection<br>10 = strongly favors environment protection at the cost of economic growth'],
  regions: ['Regionalism', true, true, 'Political decentralization to regions/localities<br>0 = strongly opposes political decentralization<br>10 = strongly favors political decentralization']
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
  1: ['Radical Right', '#1F77B4'],
  2: ['Conservatives', '#AEC7E8'],
  3: ['Liberal', '#BCBD22'],
  4: ['Christian-Democratic', '#9467BD'],
  5: ['Socialist', '#FF9896'],
  6: ['Radical Left', '#D62728'],
  7: ['Green', '#2CA02C'],
  8: ['Regionalist', '#8C564B'],
  9: ['No faction', '#7F7F7F'],
  10: ['Confessional', '#E377C2'],
  11: ['Agrarian/Center', '#FF7F0E']
}

export function showTooltip (event, d) {
  d3.select('#tooltip')
    .style('visibility', 'visible')
    .html(`<b>${d.party}</b><br>${countries[d.country]} - ${factions[d.family][0]}<br>Votes: ${d.vote}%`)
  moveTooltip(event) // Correctly place tooltip
}

export function moveTooltip (event) {
  const tooltip = d3.select('#tooltip')

  // Tooltip dimensions (node gives the DOM element from the d3 selection)
  const width = tooltip.node().offsetWidth
  const height = tooltip.node().offsetHeight

  // event.pageX/Y give cursor position
  let x = event.pageX + 10
  let y = event.pageY + 10

  // Tooltip too much on the right
  if (x + width > window.innerWidth) {
    x = event.pageX - width // Move it to the left
  }

  // Tooltip too much on the bottom
  if (y + height > window.innerHeight) {
    y = event.pageY - height + 5 // Move it up
  }

  tooltip.style('left', `${x}px`).style('top', `${y}px`)
}

export function hideTooltip () {
  d3.select('#tooltip').style('visibility', 'hidden')
}
