var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var cors = require('cors')

var ProgressBar = require('progress');

let dev = true;
let db = "mongodb://localhost/leboncoin";
if (dev)
  db += "-dev"
console.log("With " + db);
mongoose.connect(db, function(err) {
  if (err) {
    throw err;
  }
});

var searchResultSchema = new mongoose.Schema({
  title: String,
  category: String,
  link: String,
  images: [String],
  location: String,
  urgent: Boolean,
  price: Number,
  date: String, //Date,
  id: Number,
  lat: Number,
  lon: Number,
  city: {
    type: Schema.Types.ObjectId,
    ref: 'City'
  },
});

var citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  lat: {
    type: Number
  },
  lon: {
    type: Number
  }
});

var SearchResult = mongoose.model('SearchResult', searchResultSchema);
var City = mongoose.model('City', citySchema);

let cleanup = dev;
let searchBool = dev;

if (cleanup) {

  SearchResult.remove({}, function(err) {
    if (err) {
      console.log(err);
    }
  });

  City.remove({}, function(err) {
    if (err) {
      console.log(err);
    }
  });

}

// call the packages we need
var express = require('express'); // call express
var app = express(); // define our app using express
var bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors());

var port = process.env.PORT || 8080; // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
  SearchResult.find({})
    .populate('city')
    .then((results) => {
      res.json(results);
    });
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);


const request = require('superagent');

const leboncoin = require('leboncoin-api');
var nPages = 20
var globalCounter = 0;

var timer = setInterval(function() {
  if (bar.complete) {
    clearInterval(timer);
    console.log('Magic happens on port ' + port);
  } else if (bar.curr === 5) {
    bar.interrupt('this message appears above the progress bar\ncurrent progress is ' + bar.curr + '/' + bar.total);
  }
}, 2000);

if (searchBool) {
  var bar = new ProgressBar('Searched pages [:bar] :current/:total :percent :etas', {
    complete: '=',
    incomplete: ' ',
    total: nPages
  });
  for (let i = 0; i < nPages; i++) {
    var search = new leboncoin.Search()
      .setPage(i)
      .setCategory("locations")
      .setRegion("rhone_alpes")
      .setDepartment("isere")
      .addSearchExtra("mrs", 500) // min rent
      .addSearchExtra("mre", 1500) // max rent
      .addSearchExtra("ret", [1]) // house and garden (3)

    search.run().then(function(data) {

      if (data.nbResults === 0) {
        crawledAll = true;
      }
      for (let i = 0; i < data.results.length; i++) {
        let foundCity = data.results[i].location.split(' / ')[0];
        City
          .findOne({
            city: foundCity
          })
          .then((city) => {
            var p = new mongoose.Promise();
            if (!city) {
              request
                .get('http://api.geonames.org/searchJSON')
                .query({
                  q: foundCity,
                  country: 'FR',
                  username: "7hibault"
                }) // query string
                .end((err, res) => {
                  if (err) console.log(err);
                  let obj = {
                    name: foundCity
                  }
                  if (res.body.geonames && res.body.geonames.length > 0) {
                    let j = 0;
                    while (res.body.geonames[j].adminName1 != "Auvergne-Rhône-Alpes") j++;
                    obj.lat = Number(res.body.geonames[j].lat);
                    obj.lon = Number(res.body.geonames[j].lng);
                  }
                  let newCity = new City(obj);
                  newCity.save(function(err) {
                    if (err) console.log(err);
                    // console.log("inserted " + foundCity);
                    p.fulfill(newCity);
                  });
                });
            } else {
              // console.log("city " + city.name + " already found");
              p.fulfill(city);
            }
            return p;
          })
          .then((city) => {
            let result = {
              city: city,
              price: data.results[i].price,
              link: data.results[i].link,
              images: data.results[i].images
            }
            let insertResult = new SearchResult(result);
            insertResult.save(function(err) {
              if (err) console.log(err);
            })
          })
          .catch((err) => {
            console.log(err);
          });
      }
      bar.tick();
    }, function(err) {
      console.error(err);
    });
  }
}
