'use strict';

process.env.DEBUG = 'actions-on-google:*'
const App = require('actions-on-google').DialogflowApp
const functions = require('firebase-functions')
const axios = require('axios')

const GET_BEER_ACTION = 'getBeer';
const COMPARE_BEERS_ACTION = 'compareBeers';
const ADD_TO_FRIDGE_ACTION = 'addToBeerFridge'
const OPTIONS_ACTION = 'carouselSelection'


const BEER = 'beer'
const BREWERY = 'brewery'
const url = 'https://api.ratebeer.com/v1/api/graphql'
const apiKey = functions.config().whatbeer.key

// Utility Functions
const sortResultsHighToLow = arr => arr.sort((a, b) => b.averageRating - a.averageRating)
const getBeers = beer => {
  const query =`query{beerSearch(query: "${beer}") { items { id, name, description, abv, averageRating, overallScore, ratingCount, imageUrl } } }`
  return axios.post("/", JSON.stringify({query: query}))
    .then(r => r.data.data.beerSearch.items)
    .catch(e => e)
}

const getFirstBeer = beer => {
  const query =`query{beerSearch(query: "${beer}") { items { id, name, description, abv, averageRating, overallScore, ratingCount, imageUrl } } }`
  return axios.post("/", JSON.stringify({query: query}))
    .then(r => r.data.data.beerSearch.items[0])
    .catch(e => e)
}

let currentBeer = ''

// Set axios defaults
axios.defaults.baseURL = url
axios.defaults.headers.post['Content-Type'] = 'application/json'
axios.defaults.headers.post['Accept'] = 'application/json'
axios.defaults.headers.post['x-api-key'] = apiKey


const compareBeers = app => {
  console.log('CompareBeers Called');
  const beerList = app.getArgument(BEER);
  console.log('Beer List: ', beerList);
  Promise.all(beerList.map(getFirstBeer))
    .then(sortResultsHighToLow)
    .then(arr => {
      if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
        if (arr.length === 1) {
          currentBeer = arr[0].name
          app.ask(app.buildRichResponse()
            .addSimpleResponse('Here\'s what I found.  Anything else I can help you with?')
            .addBasicCard(app.buildBasicCard(arr[0].description)
              .setTitle(arr[0].name)
              .setSubtitle(`${arr[0].averageRating.toFixed(2)}/5 avg rating | ${arr[0].overallScore.toFixed(2)} overall score`)
              .setImage(arr[0].imageUrl, 'beer image')
              .addButton('Go to RateBeer', `https://www.ratebeer.com/beer/${arr[0].id}/`)
            )
            .addSuggestions([`Add to fridge`])) // Not sure if I want to keep this
        } else if (arr.length > 1 && arr.length < 11) {
          const oi = arr.map((b, i) => {
            if (i === 0) currentBeer = b.name
            return app.buildOptionItem(b.name)
              .setTitle(b.name)
              .setDescription(`${b.averageRating.toFixed(2)}/5 average rating\n${b.description}`)
              .setImage(b.imageUrl, 'beer image')
          })
          app.askWithCarousel(`Looks like ${arr[0].name} is the higher ranked beer with a rating of ${arr[0].averageRating.toFixed(2)}/5 out of ${arr[0].ratingCount} reviews compared to ${arr[1].averageRating.toFixed(2)}/5 out of ${arr[1].ratingCount} reviews.`, app.buildCarousel().addItems(oi))
        } else {
          console.log('NEED SOMETHING HERE');
        }
      } else {
        app.tell(`Looks like ${arr[0].name} is the higher ranked beer with a rating of ${arr[0].averageRating.toFixed(2)}/5 out of ${arr[0].ratingCount} reviews compared to ${arr[1].averageRating.toFixed(2)}/5 out of ${arr[1].ratingCount} reviews.`)
      }
    })
}

const fetchBeer = app => {
  console.log('Calling Fetch Beer');
  const beer = app.getArgument(BEER) || app.getSelectedOption();
  console.log('BEER: ', beer);
  getBeers(beer)
    .then(arr => {
      console.log('Arr: ', arr);
      currentBeer = arr[0].name
      if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
        if (arr.length === 1) {
          currentBeer = arr[0].name
          app.ask(app.buildRichResponse()
            .addSimpleResponse('Here\'s what I found.  Anything else I can help you with?')
            .addBasicCard(app.buildBasicCard(arr[0].description)
              .setTitle(arr[0].name)
              .setSubtitle(`${arr[0].averageRating.toFixed(2)}/5 avg rating | ${arr[0].overallScore.toFixed(2)} overall score`)
              .setImage(arr[0].imageUrl, 'beer image')
              .addButton('Go to RateBeer', `https://www.ratebeer.com/beer/${arr[0].id}/`)
            ))
        } else if (arr.length > 1 && arr.length < 11) {
          const oi = arr.map((b, i) => {
            if (i === 0) currentBeer = b.name
            return app.buildOptionItem(b.name)
              .setTitle(`${b.name}`)
              .setDescription(b.description)
              .setImage(b.imageUrl, 'beer image')
          })
          app.askWithCarousel(`${arr[0].name} has an average rating of ${arr[0].averageRating.toFixed(2)}/5 out of ${arr[0].ratingCount} reviews and an overall score of ${arr[0].overallScore.toFixed(2)}.  I've included some similar beers as well.`, app.buildCarousel().addItems(oi))
        } else {
          console.log('NEED SOMETHING HERE');
        }
      } else {
        app.tell(`${arr[0].name} has an average rating of ${arr[0].averageRating.toFixed(2)} out of ${arr[0].ratingCount} reviews.`)
      }
    })
    .catch(() => app.ask(`I'm sorry, I didn't get that.  Can you please say the beer name again`))
}

//const addToFridge = app => {
  //const beer = (app.getArgument(BEER)).length !== 0
    //? app.getArgument(BEER)
    //: currentBeer
  //// Clean this up with a map.  I did something similar with the serviceability app
  //app.ask(`Ok.  I'm adding ${beer} to your fridge.  Anything else I can help you with?`)
//}

exports.getBeer = functions.https.onRequest((request, response) => {
  const app = new App({request, response});
  const actionMap = new Map();
  actionMap.set(GET_BEER_ACTION, fetchBeer);
  actionMap.set(COMPARE_BEERS_ACTION, compareBeers);
  //actionMap.set(ADD_TO_FRIDGE_ACTION, addToFridge);
  actionMap.set(OPTIONS_ACTION, fetchBeer);
  app.handleRequest(actionMap);
});
