var mongoose = require('mongoose');

var osmium = require('osmium');
mongoose.connect('mongodb://localhost/leboncoin', function(err) {
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
  city: String
});

var citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lon: {
    type: Number,
    required: true
  }
});

var SearchResult = mongoose.model('SearchResult', searchResultSchema);
var City = mongoose.model('City', citySchema);

let cleanup = false;

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

// var port = process.env.PORT || 8080; // set our port
//
// // ROUTES FOR OUR API
// // =============================================================================
// var router = express.Router(); // get an instance of the express Router
//
// // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
// router.get('/', function(req, res) {
//   searchResult.find({})
//     .then((results) => {
//       res.json(results);
//     });
// });
//
// // REGISTER OUR ROUTES -------------------------------
// // all of our routes will be prefixed with /api
// app.use('/api', router);
//
// // START THE SERVER
// // =============================================================================
// app.listen(port);
// console.log('Magic happens on port ' + port);


const request = require('superagent');

const leboncoin = require('leboncoin-api');
var nPages = 15
var sleep = require('sleep');


// http://api.geonames.org/searchJSON?q=grenoble&country=FR&username=7hibault&featureClass=PPL



for (let i = 0; i < nPages; i++) {
  var search = new leboncoin.Search()
    .setPage(i)
    .setCategory("locations")
    .setRegion("rhone_alpes")
    .setDepartment("isere")
    .addSearchExtra("mrs", 500) // min rent
    .addSearchExtra("mre", 1500) // min rent
    .addSearchExtra("ret", [1]) // house and garden (3)

  search.run().then(function(data) {
    // console.log(data)
    // console.log(data.page); // the current page
    // console.log(data.nbResult); // the number of results for this search
    //console.log(data.results); // the array of results
    if (data.nbResults === 0) {
      crawledAll = true;
    }
    // for (let i = 0; i < data.results.length; i++) {
    // console.log(data.results[i]);
    // sleep.usleep(1000000);
    // let insert = new searchResult(data.results[i]);
    let foundCity = "voreppe"; //data.results[i].location.split(' / ')[0];
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
              q: city,
              country: 'FR',
              username: "7hibault"
            }) // query string
            .end((err, res) => {
              if (err) console.log(err);
              let obj = {
                name: foundCity
              }
              if (res.body.geonames.length > 0) {
                obj.lat = Number(res.body.geonames[0].lat);
                obj.lon = Number(res.body.geonames[0].lng);
              }
              let newCity = new City(obj);
              newCity.save(function(err) {
                if (err) console.log(err);
                console.log("inserted " + foundCity);
                p.fulfill(newCity);
              });
            });
        } else {
          console.log("city " + city.name + " already found");
          p.fulfill(city);
        }
        return p;
      })
      .then((city) => {
        let result = {
          city: city.name
        }
        let insertResult = new SearchResult(result);
        insertResult.save(function(err) {
          if (err) console.log(err);
          else console.log("inserted " + insertResult);
        })
      })
      .catch((err) => {
        console.log(err);
      });
    // }
    /*
	    data.results[0].getDetails().then(function (details) {
		console.log(details); // the item 0 with more data such as description, all images, author, ...
	    }, function (err) {
		console.error(err);
	    });
	    data.results[0].getPhoneNumber().then(function (phoneNumer) {
		console.log(phoneNumer); // the phone number of the author if available
	    }, function (err) {
		console.error(err); // if the phone number is not available or not parsable (image -> string)
	    });
	    */
  }, function(err) {
    console.error(err);
  });


}
