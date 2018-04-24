/* INITIALIZE PACKAGES */
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser')
var session = require('express-session');
var CASAuthentication = require('cas-authentication');
var admin = require('firebase-admin');
var path = require('path');
/* CREATE EXPRESS APP AND SERVER */
var app = express();
var server = http.createServer(app);


/* MISC. */
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/js', express.static(__dirname + '/js'));
app.use(bodyParser.json());

/* EXPRESS SESSIONS */
app.use(session({
    secret: 'JLNohdzPkf',
    resave: false,
    saveUninitialized: true,
    cookie: {
    	user: null
    }
}));

/* FIREBASE ADMINS */
// Firebase Admins SetUp
var serviceAccount = require('./resources/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webscience2018.firebaseio.com/",
  // Rules Option
  databaseAuthVariableOverride: {
  	uid: "nodejs-worker-application"
  }
});

// Initialize Database
var db = admin.database();
var usersref = db.ref("/users");
var locationsref = db.ref("/locations");
var reservationref = db.ref("/reservations");

/* FUNCTIONS */
// Checking if API is validated for access
function validateAccess(req,res,next){
	if(req.session && req.session[cas.session_name]){
		var username = req.session[cas.session_name];
		usersref.orderByChild("user").equalTo(username).once("value", function(snapshot){
			var data = snapshot.val();
			var userkey = Object.keys(data)[0];
			req.username = username;
			req.admin = data[userkey]["admin"];
			req.success = true;
			return next();
		});
	}else if(req.query && req.query.apikey){
		// Check if API Key is valid
		var query = req.query.apikey;
		usersref.orderByChild("key").equalTo(query).once("value", function(snapshot){
			if(snapshot.numChildren() !== 0) {
				var userkey = req.query.apikey;
				usersref.orderByChild("key").equalTo(userkey).once("value", function(snapshot){
					var data = snapshot.val();
					req.username = data[userkey]["user"];
					req.admin = data[userkey]["admin"];
					req.success = true;
					return next();
				});
			}
		});
		return res.status(401).json({success:false,message:"Invalid API Key provided or missing. Make sure to pass your key to 'apikey'."});
	}else{
		return res.status(401).json({success:false,message:"Unauthorized API calls."});
	}
}

// Checking if active session is available for web application
function requireActiveSession(req,res,next){
	if(req.session && req.session[cas.session_name]){
		return next();
	}else{
		var err = new Error("Must be logged in using CAS to view this page.");
		err.status = 401;
		return next(err);
	}
}

/* WEB APPLICATION ROUTES */
// Landing Route
app.get('/',function(req,res){
	res.render('mainpage.ejs');
});
// Profile Route
app.get('/profile',requireActiveSession,function(req,res){
	var username = req.session[cas.session_name];
	usersref.orderByChild("user").equalTo(username).once("value", function(snapshot){
		var data = snapshot.val();
		var key = Object.keys(data)[0];
		var name = data[key]["name"];
		if(req.query && req.query.name){
			// If name has been sent
			var dbparams = {};
			var dbendpoint = key + "/name";
			dbparams[dbendpoint] = req.query.name;
			usersref.update(dbparams);
			return res.render('profile.ejs',{name: dbparams[dbendpoint]});
		}else if(name === ""){
			// If name has not been set
			return res.render('setup.ejs');
		}else{
			// User profile created
			return res.render('profile.ejs',{name: name});
		}
	});
});
// Display route
app.get('/displayPage',function(req,res){
	res.render('display.ejs');
});


/* CAS APP ROUTING */
// CAS Authentication Set Up
var cas = new CASAuthentication({
    cas_url: 'https://cas-auth.rpi.edu/cas',
    service_url: 'http://localhost:3000',
    cas_version: '2.0'
});
// CAS Authentication Bounce
app.get('/authenticate', cas.bounce, function(req,res){
	// After portal successfully authenticates
	var username = req.session[cas.session_name];
	// Add user if missing
	usersref.orderByChild("user").equalTo(username).once("value", function(data){
		if(data.numChildren() === 0) {
			var userskeyref = usersref.push();
			userskeyref.set({				
				admin: false,
				createdat: admin.database.ServerValue.TIMESTAMP,
				key: userskeyref.key,
				name: "",
				user: username
			});
		}
		return res.redirect('/profile');
	});
});
// CAS Log Out
app.get('/logout', cas.logout);


/* STANDARD API CALLS */
/* ---------------------------------------
 * NAME
 * /reserve
 * DESCRIPTION
 * Makes a reserve attempt on a room
 * ---------------------------------------
 */
app.get('/reserve',validateAccess,function(req,res){
	if(!req.success){
		return res.status(401).json({success:false,message:"Failed to retrieve user info."});
	}else if( !(req.query && req.query.locationkey && req.query.roomkey && req.query.timeslot && req.query.date && req.query.roomkey) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var dt = {
			time: parseInt(req.query.timeslot),
			date: req.query.date
		};
		var linkkey = "/" + req.query.locationkey + "/rooms/" + req.query.roomkey;
		var locationChild = locationsref.child(linkkey);
		locationChild.once("value", function(lsnapshot){
			if(lsnapshot.numChildren() === 0){
				// Failure response
				return res.status(404).json({success:false,message:"Specified location not found."});
			}else{
				var ldata = lsnapshot.val();
				var maxseats = ldata["maxseats"];
				reservationref.once("value", function(snapshot){
			 		var spotsfilled = 0;
			 		snapshot.forEach(function(data) {
			 			var tmp = data.val();
			 			// Check if date + time + roomkey + lockey match
						if(tmp["datetime"]["date"] == dt.date && tmp["datetime"]["time"] == dt.time && req.query.roomkey == tmp["roomkey"] && req.query.locationkey == tmp["lockey"]){
							spotsfilled++;
						}
						if(spotsfilled === maxseats){
							return;
						}
					});
					if(spotsfilled < maxseats){
						reservationref.push().set({
			 				lockey: req.query.locationkey,
			 				roomkey: req.query.roomkey,
			 				user: req.username,
			 				datetime: dt
			 			});
					}else{
						// Failure response
						return res.status(200).json({success:false,message:"Room has already been taken."});
					}
				});
			}
		});
		
	}
	return res.status(200).json({success:true,message:"Successfully reserved room."});
});

/* ---------------------------------------
 * NAME
 * /getLocations
 * DESCRIPTION
 * Returns JSON response containing locations
 * ---------------------------------------
 */
app.get('/getAllRooms',validateAccess,function(req,res){
	locationsref.once("value", function(snapshot){
		var rooms = [];
		snapshot.forEach(function(data) {
			var lockey = data.key;
	 		var val = data.val();
			for(var roomkey in val["rooms"]){
		        var roominfo = {};
		        roominfo["lockey"] = lockey;
		        roominfo["roomkey"] = roomkey;
		        roominfo["maxseats"] = val["rooms"][roomkey]["maxseats"];
		        roominfo["roomnum"] = val["rooms"][roomkey]["roomnum"];
		        rooms.push(roominfo);
		    }
		});
		return res.status(200).json({success:true,data:rooms});
	});
});

/* ---------------------------------------
 * NAME
 * /getReservations
 * DESCRIPTION
 * Returns JSON response containing provided users reservations
 * ---------------------------------------
 */
app.get('/getReservations',validateAccess,function(req,res){
	reservationref.orderByChild("user").equalTo(req.username).once("value", function(snapshot){
		var reservations = [];
 		snapshot.forEach(function(data) {
	 		var val = data.val();
			val["key"] = data.key;
			reservations.push(val);
		});
		return res.status(200).json({success:true,data:reservations});
	});
});

/* ADMIN PRIVILEGE API CALLS */
/* ---------------------------------------
 * NAME
 * /addLocation
 * DESCRIPTION
 * Add a new location
 * ---------------------------------------
 */
app.get('/addLocation',validateAccess,function(req,res){
	if(!req.success || !req.admin){
		return res.status(401).json({success:false,message:"Failed to retrieve user info or user does not have the proper privileges."});
	}else if( !(req.query && req.query.name && req.query.floorplan) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		// Push to Firebase
		var lockeyref = locationsref.push();
		lockeyref.set({
			name: req.query.name,
			floorplan: req.query.floorplan,
			numrooms: 0,
			rooms:[]
		});
		return res.status(200).json({success:true,data: lockeyref.key});
	}
});

/* ---------------------------------------
 * NAME
 * /addRoom
 * DESCRIPTION
 * Add a new room to an existing location
 * ---------------------------------------
 */
app.get('/addRoom',validateAccess,function(req,res){
	if(!req.success || !req.admin){
		return res.status(401).json({success:false,message:"Failed to retrieve user info or user does not have the proper privileges."});
	}else if( !(req.query && req.query.locationkey && req.query.floorplan && req.query.maxseats && req.query.roomnum) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var locationkey = req.query.locationkey;
		var locationChild = locationsref.child("/"+locationkey);
		// Check if location key already exists
		locationChild.once("value", function(snapshot){
			if(snapshot.numChildren() === 0){
				// Failure response
				return res.status(404).json({success:false,message:"Specified location not found."});
			}else{
				var locinfo_table = data.val();
				// Update Firebase
				locationChild.update({
					"numrooms": locinfo_table["numrooms"] + 1
				});
				// Push room data
				var roomChild = locationChild.child("/rooms");
				var roomkeyref = roomChild.push();
				roomkeyref.set({
					"maxseats": parseInt(req.query.maxseats),
					"roomnum": req.query.roomnum
				});
				return res.status(200).json({success:true,data:roomkeyref});
			}
		});
	}
});

/* ADDITIONAL FUNCTIONS */
app.get('/user', function(req, res) {
    res.render('user.ejs')
});

app.get('/select', function(req, res) {
    res.render('select.ejs')
});

app.get('/ts', function(req, res) {
    res.render('timeslot.ejs')
});

app.get('/cf', function(req, res) {
    res.render('confirm.ejs')
});

app.get('/sus', function(req, res) {
    res.render('success.ejs')
});

/*// TODO need to remove it if authenticated part completed.
EDITED AND ADDED SECTION ABOVE
app.get('/admin', function(req, res) {
    var userchild = usersref.child("/"+req.session.sessionkey);
    userchild.once("value", function(data){
        var userinfo = data.val();
        res.render('admin.ejs',{name: userinfo["name"]});
    });
    // res.render('admin.ejs',{name: userinfo["name"]});
});
*/

app.get("/adrom", function(req, res) {
    res.render('newroom.ejs');
});

app.get("/adres", function(req, res) {
    res.render('newreserv.ejs');
});

app.get("/adloc", function(req, res) {
    res.render('newloc.ejs');
});


/* SERVER PORT */
server.listen(3000);
console.log("Listening on port 3000...");
