const axios = require('axios');
const express = require('express');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const server = express();
const path = require('path');
const carfilemgr = require('./carfilemgr');
const yargs = require('yargs');

const argv = yargs
.options('address')
.argv;

const addr = argv.address;

const port = process.env.PORT || 3000;

server.use(bodyParser.urlencoded( {extended: true} ));
server.set('view engine','hbs');
hbs.registerPartials(__dirname + '/views/partials');

//<--Places -->
const PLACES_API_KEY = 'AIzaSyBAvfNtoCSNBMiiQFkJKKWNqSDD6L2Q2WU';
var filteredResults;

hbs.registerHelper('list', (items, options) => {
  items = filteredResults;
  var out = "<tr><th>Name</th><th>Address</th><th>Photo</th></tr>";
  const length = items.length;

  for(var i=0; i<length; i++) {
    out = out + options.fn(items[i]);
  }

  return out;
});

server.post('/carform',(req, res) => {
  res.render('carform.hbs');
})

server.get('/',(req, res) => {
  res.render('main.hbs');
});

server.use(express.static(path.join(__dirname, 'public')));

server.get('/carform',(req, res) => {
  res.render('carform.hbs');
});

server.post('/getplaces', (req, res) => {
  const addr = req.body.address;
  const placetype = req.body.placetype;
  const name = req.body.name;
  const locationReq = `https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=AIzaSyBkUVxs91pzUSiMU2DpGs7tO5tjUaZ_Z_k`;

  axios.get(locationReq).then((response) => {
    const locationData = {
      addr: response.data.results[0].formatted_address,
      lat: response.data.results[0].geometry.location.lat,
      lng: response.data.results[0].geometry.location.lng,
    }

    const placesReq = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${locationData.lat},${locationData.lng}&radius=1500&types=${placetype}&name=${name}&key=${PLACES_API_KEY}`;

    return axios.get(placesReq);
  }).then((response) => {

    filteredResults = extractData(response.data.results);

    carfilemgr.saveData(filteredResults).then((result) => {
      res.render('carresult.hbs');
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

  }).catch((error) => {
    console.log(error);
  });
});

server.get('/carhistorical', (req, res) => {
  carfilemgr.getAllData().then((result) => {
    filteredResults = result;
    res.render('carhistorical.hbs');
  }).catch((error) => {
    console.log(errorMessage);
  });
});

server.post('/cardelete', (req, res) => {
  carfilemgr.deleteAll().then((result) => {
    filteredResults = result;
    res.render('carhistorical.hbs');
  }).catch((errorMessage) => {
    console.log(errorMessage);
  });
});


const extractData = (originalResults) => {
  var placesObj = {
    table: [],
  };

  const length = originalResults.length;

  for (var i=0; i<length; i++) {
    if(originalResults[i].photos){
      const photoRef = originalResults[i].photos[0].photo_reference;
      const requestUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${PLACES_API_KEY}`;
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        photo_reference: requestUrl,
      }
    } else{
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        photo_reference: `/no_image_found.png`,
      }
    }

    placesObj.table.push(tempObj);
  }
  return placesObj.table;
};

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
