var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/leboncoin', function(err) {
  if (err) { 
    throw err; 
  }
});

var searchResultSchema = new mongoose.Schema({
  title: String,
  category: String,
  link: String,
  images: [ String ],
  location: String,
  urgent: Boolean,
  price: Number,
  date: String,//Date,
  id: Number,
  lat: Number,
  lon: Number
});

var searchResult = mongoose.model('SearchResult', searchResultSchema);
searchResult.remove({}, function(err) {
  if (err) { console.log(err); }
});

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    searchResult.find({})
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
console.log('Magic happens on port ' + port);


const request = require('superagent');

const leboncoin = require('leboncoin-api');
var nPages = 15
var sleep = require('sleep');

for (let i = 0; i < nPages; i++) {
	var search = new leboncoin.Search()
	    .setPage(i)
	    .setCategory("locations")
	    .setRegion("rhone_alpes")
	    .setDepartment("isere")
	    .addSearchExtra("mrs", 500) // min rent
	    .addSearchExtra("mre", 1500) // min rent
	    .addSearchExtra("ret", [1, 3]) // house and garden

	search.run().then(function (data) {
	    //console.log(data.page); // the current page
	    //console.log(data.nbResult); // the number of results for this search
	    //console.log(data.results); // the array of results
	    if (data.nbResults === 0) { crawledAll = true; }
	    for (let i = 0; i < data.results.length; i++) {
		  sleep.usleep(1000000);
		let insert = new searchResult(data.results[i]);
		console.log(data.results[i]);
		let city = data.results[i].location.split(' / ')[0];
		request
		  .get('https://nominatim.openstreetmap.org/search')
		  .query({ q: city + ", isere", format: 'json' }) // query string
		  .end((err, res) => {
			if (err) console.log(err);
			if (res.body.length > 0) {
				insert.lat = res.body[0].lat;
				insert.lon = res.body[0].lon;
			}
		    	insert.save(function(err){
			  if(err) { throw err; }
		   	  console.log("Added #"+i);
			});
		  });
	    }
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
	}, function (err) {
	    console.error(err);
	});


}


