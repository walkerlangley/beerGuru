'use strict';

const axios = require('axios')

// b. the parameters that are parsed from the make_name intent
const BEER = 'beer'
const BREWERY = 'brewery'

//const getFirstBeer = beer => beer.beerSearch.items[0]
const getBeers = beer => {
  const query =`query{beerSearch(query: "${beer}") { items { id, name, description, abv, averageRating, overallScore, ratingCount, imageUrl } } }`
  return axios.post("/", JSON.stringify({query: query}))
    .then(r => r.data.data.beerSearch.items)
    .catch(e => console.log('ERROR: ', e));
}

const getFirstBeer = beer => {
  const query =`query{beerSearch(query: "${beer}") { items { id, name, description, abv, averageRating, overallScore, ratingCount, imageUrl } } }`
  return axios.post("/", JSON.stringify({query: query}))
    .then(r => r.data.data.beerSearch.items[0])
    .catch(e => console.log('ERROR: ', e));
}
const sortResultsHighToLow = arr => arr.sort((a, b) => b.averageRating - a.averageRating)

// Utility Functions
const apiKey = process.env.RATEBEER_API_KEY
const url = 'https://api.ratebeer.com/v1/api/graphql'

axios.defaults.baseURL = url
axios.defaults.headers.post['Content-Type'] = 'application/json'
axios.defaults.headers.post['Accept'] = 'application/json'
axios.defaults.headers.post['x-api-key'] = apiKey

function compareBeers (arr) {
  Promise.all(arr.map(getFirstBeer))
    .then(sortResultsHighToLow)
    .then(arr => console.log(`I'd recommend ${arr[0].name}.  It has an average rating of ${arr[0].averageRating.toFixed(2)} compared to ${arr[1].name} which has an average rating of ${arr[1].averageRating.toFixed(2)}`))
}

function fetchBeer (beer) {
  getBeers(beer).then(d => console.log('D: ', d));
}

fetchBeer('young\'s double chocolate stout');
//compareBeers(['par 4', 'jam session'])
//compareBeers(['guinness, guinness'

