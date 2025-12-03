import * as d3 from 'd3'
import controller from './controller'

export function formatParty (row) { // For each csv row, return an object (Party)
  if (row.party_id === undefined) throw new Error('Party with missing ID')

  return {
    country: parseInt(row.country),
    year: parseInt(row.year),
    party_id: parseInt(row.party_id),
    party: row.party,
    vote: parseFloat(row.vote),
    // seat: parseFloat(row.seat),
    epvote: parseFloat(row.epvote),
    family: parseInt(row.family),
    lrgen: parseFloat(row.lrgen),
    lrecon: parseFloat(row.lrecon),
    eu_position: parseFloat(row.eu_position),
    eu_foreign: parseFloat(row.eu_foreign),
    eu_intmark: parseFloat(row.eu_intmark),
    spendvtax: parseFloat(row.spendvtax),
    deregulation: parseFloat(row.deregulation),
    redistribution: parseFloat(row.redistribution),
    civlib_laworder: parseFloat(row.civlib_laworder),
    sociallifestyle: parseFloat(row.sociallifestyle),
    religious_principles: parseFloat(row.religious_principles),
    immigrate_policy: parseFloat(row.immigrate_policy),
    multiculturalism: parseFloat(row.multiculturalism),
    ethnic_minorities: parseFloat(row.ethnic_minorities),
    regions: parseFloat(row.regions),
    environment: parseFloat(row.environment),
    nationalism: parseFloat(row.nationalism),
    leftgen: parseFloat(row.leftgen),
    rightgen: parseFloat(row.rightgen),
    leftecon: parseFloat(row.leftecon),
    rightecon: parseFloat(row.rightecon),
    mds1: parseFloat(row.mds1),
    mds2: parseFloat(row.mds2),
    hovered: false,
    brushed: false
  }
}

export const TR_TIME = 300

export const years = [1999, 2002, 2006, 2010, 2014, 2019, 2024]

export const attributes = { // Reordered so that similar topics are close
  family: {
    name: 'Political faction',
    goesOnLineChart: false,
    goesOnParallelCoordinates: true,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Parties\' political<br>faction in '
  },
  country: {
    name: 'Country',
    goesOnLineChart: false,
    goesOnParallelCoordinates: true,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Parties\' country of origin'
  },
  vote: {
    name: 'Votes in the most recent national election (%)',
    goesOnLineChart: true,
    goesOnParallelCoordinates: false,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Vote percentage received by<br>the parties in the national election<br>most prior to the given year'
  },
  /* seat: {
    name: 'Parliament seats in the most recent national election (%)',
    goesOnLineChart: true,
    goesOnParallelCoordinates: false,
    minYear: 1999,
    description: 'Parties\' seat share in the national<br>election most prior to the given year'
  }, */
  epvote: {
    name: 'Votes in the most recent European election (%)',
    goesOnLineChart: true,
    goesOnParallelCoordinates: false,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Vote percentage received by the<br>parties in the European Parliament<br>election most prior to the given year'
  },
  lrgen: {
    name: 'Left/right',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Overall ideological stance<br>5 = extreme right<br>0 = center<br>-5 = extreme left'
  },
  lrecon: {
    name: 'Economic left/right',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: false,
    minYear: 1999,
    description: 'Ideological stance on economic issues<br>5 = extreme right<br>0 = center<br>-5 = extreme left'
  },
  leftgen: {
    name: 'Left',
    goesOnLineChart: false,
    goesOnParallelCoordinates: false,
    goesOnRadviz: true,
    minYear: 1999,
    description: ''
  },
  rightgen: {
    name: 'Right',
    goesOnLineChart: false,
    goesOnParallelCoordinates: false,
    goesOnRadviz: true,
    minYear: 1999,
    description: ''
  },
  leftecon: {
    name: 'Economic left',
    goesOnLineChart: false,
    goesOnParallelCoordinates: false,
    goesOnRadviz: true,
    minYear: 1999,
    description: ''
  },
  rightecon: {
    name: 'Economic right',
    goesOnLineChart: false,
    goesOnParallelCoordinates: false,
    goesOnRadviz: true,
    minYear: 1999,
    description: ''
  },
  spendvtax: {
    name: 'Public spending',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Improving public services vs. reducing taxes<br>10 = strongly favors improving public services<br>0 = strongly favors reducing taxes'
  },
  redistribution: {
    name: 'Wealth redistribution',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Redistribution of wealth from the rich to the poor<br>10 = strongly favors redistribution<br>0 = strongly opposes redistribution'
  },
  deregulation: {
    name: 'Market deregulation',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Deregulations of markets<br>10 = strongly favors deregulation<br>0 = strongly opposes deregulation'
  },
  eu_position: {
    name: 'European Union',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 1999,
    description: 'European integration<br>10 = strongly in favor<br>0 = strongly opposed'
  },
  eu_intmark: {
    name: 'EU internal market',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2002,
    description: 'Internal market (free movement of goods, services, etc.)<br>10 = strongly in favor<br>0 = strongly opposed'
  },
  eu_foreign: {
    name: 'EU foreign policy',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 1999,
    description: 'EU foreign and security policy<br>10 = strongly in favor<br>0 = strongly opposed'
  },
  immigrate_policy: {
    name: 'Immigration restriction',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Immigration policies<br>10 = strongly favors restrictive policies<br>0 = strongly favors liberal policies'
  },
  multiculturalism: {
    name: 'Multiculturalism',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Integration of immigrants and asylum seekers<br>10 = strongly favors multiculturalism<br>0 = strongly favors assimilation'
  },
  ethnic_minorities: {
    name: 'Ethnic minorities',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Rights for ethnic minorities<br>10 = strongly favors more rights<br>0 = strongly opposes more rights'
  },
  nationalism: {
    name: 'Nationalism',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2014,
    description: 'Nationalism vs. cosmopolitanism<br>10 = Strongly favors a nationalist society<br>0 = Strongly favors a cosmopolitan society'
  },
  civlib_laworder: {
    name: 'Law & order',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Law & order vs. civil liberties<br>10 = strongly favors tough measures to fight crime<br>0 = strongly favors civil liberties'
  },
  sociallifestyle: {
    name: 'Social lifestyle',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'LGBT rights, gender equality, etc.<br>10 = strongly favors liberal policies<br>0 = strongly opposes liberal policies'
  },
  religious_principles: {
    name: 'Religion in politics',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Role of religious principles in politics<br>10 = strongly favors religion in politics<br>0 = strongly opposes religion in politics'
  },
  environment: {
    name: 'Environment protection',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2010,
    description: 'Environmental sustainability<br>10 = strongly favors environment protection at the cost of economic growth<br>0 = strongly favors economic growth at the cost of environment protection'
  },
  regions: {
    name: 'Regionalism',
    goesOnLineChart: true,
    goesOnParallelCoordinates: true,
    goesOnRadviz: true,
    minYear: 2006,
    description: 'Political decentralization to regions/localities<br>10 = strongly favors political decentralization<br>0 = strongly opposes political decentralization'
  }
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
  1: { name: 'Radical Right', color: '#1F77B4' },
  2: { name: 'Conservatives', color: '#AEC7E8' },
  3: { name: 'Liberal', color: '#BCBD22' },
  4: { name: 'Christian-Democratic', color: '#9467BD' },
  5: { name: 'Socialist', color: '#FF9896' },
  6: { name: 'Radical Left', color: '#D62728' },
  7: { name: 'Green', color: '#2CA02C' },
  8: { name: 'Regionalist', color: '#8C564B' },
  9: { name: 'No faction', color: '#7F7F7F' },
  10: { name: 'Confessional', color: '#E377C2' },
  11: { name: 'Agrarian/Center', color: '#FF7F0E' }
}

export function showTooltip (event, d) {
  const tooltip = d3.select('#tooltip').style('visibility', 'visible')

  if (d.party) { // Party hover
    tooltip.html(`<b>${d.party}</b><br>${countries[d.country]} - ${factions[d.family].name}<br>Votes: ${d.vote}%`)
  } else { // Legend hover
    tooltip.html(d !== 'family' ? attributes[d].description : `${attributes[d].description}${controller.getYear()}`)
  }
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
