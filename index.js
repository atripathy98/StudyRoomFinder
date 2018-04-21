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

/* LANDING ROUTE */
app.get('/',function(req,res){
	res.render('mainpage.ejs');
});


/* APPLICATION ROUTES */
app.get('/profile',function(req,res){
	// Initial profile creation (get name)
	if(req.session.profilestatus == 0){
		req.session.profilestatus++;
		res.render('setup.ejs',{user: req.session.username});
	// Update Firebase (set name)
	}else if(req.session.profilestatus == 1){
		req.session.profilestatus++;
		var data = {};
		var key = req.session.sessionkey + "/name";
		data[key] = req.query.name;
		usersref.update(data);
		res.render('profile.ejs',{name: data[key]});
	// Render profile page
	}else{
		var userchild = usersref.child("/"+req.session.sessionkey);
		userchild.once("value", function(data){
			var userinfo = data.val();
	 		res.render('profile.ejs',{name: userinfo["name"]});
		});
	}
});

/* DISPLAY ROUTE */
app.get('/displayPage',function(req,res){
	res.render('display.ejs');
});

/* STANDARD API CALLS */
/* ---------------------------------------
 * NAME
 * /reserve
 * DESCRIPTION
 * Makes a reserve attempt on a room
 * INPUTS
 * req.session.username (string)
 * req.query.locationkey (string)
 * req.query.roomkey (string)
 * req.query.timeslot (int)
 * req.query.day (int)
 * ---------------------------------------
 */
app.get('/reserve',function(req,res){
	try{
		var dt = {
			time: parseInt(req.query.timeslot),
			date: parseInt(req.query.day)
		};
	 	reservationref.once("value", function(snapshot){
	 		var taken = false;
	 		snapshot.forEach(function(data) {
	 			var tmp = data.val();
				if(tmp["datetime"]["date"] == dt.date && tmp["datetime"]["time"] == dt.time){
					taken = true;
		 			return;
				}
			});
			if(!taken){
				reservationref.push().set({
	 				lockey: req.query.locationkey,
	 				roomkey: req.query.roomkey,
	 				rcsid: req.session.username,
	 				datetime: dt
	 			});
			}else{
				// Failure response
				return res.json({success:false,message:"ERROR: Room already taken."});
			}
		});
	}catch(err){
		// Failure response
		return res.json({success:false,message:"ERROR: "+err});
	}
	// Success response
	res.json({success:true});
});

/* ADMIN PRIVILEGE API CALLS */
/* ---------------------------------------
 * NAME
 * /addLocation
 * DESCRIPTION
 * Add a new location
 * INPUTS
 * req.session.admin (int)
 * req.query.name (string)
 * req.query.floorplan (string)
 * ---------------------------------------
 */
app.get('/addLocation',function(req,res){
	// Try - Catch design for formatting API response
	try{
		// Check admin privileges on active session
		if(req.session.admin == 0){
			// Failure response
			res.json({success:false,message:"ERROR: Admin privileges required."});
			return;
		}
		// Push to Firebase
		locationsref.push().set({
			name: req.query.name,
			floorplan: req.query.floorplan,
			numrooms: 0,
			rooms:[]
		});
	}catch(err){
		// Failure response
		res.json({success:false,message:"ERROR: "+err});
		return;
	}
	// Success response
	res.json({success:true});
});

/* ---------------------------------------
 * NAME
 * /addRoom
 * DESCRIPTION
 * Add a new room to an existing location
 * INPUTS
 * req.session.admin (int)
 * req.query.locationkey (string)
 * req.query.maxseats (int)
 * req.query.roomnum (string)
 * ---------------------------------------
 */
app.get('/addRoom',function(req,res){
	// Try - Catch design for formatting API response
	try{
		// Check admin privileges on active session
		if(req.session.admin == 0){
			// Failure response
			return res.json({success:false,message:"ERROR: Admin privileges required."});
		}
		var locationkey = req.query.locationkey;
		var locationChild = locationsref.child("/"+locationkey);
		// Check if location key already exists
		locationChild.once("value", function(data){
			if(data.numChildren() === 0){
				// Failure response
				return res.json({success:false,message:"ERROR: Specified location not found."});
			}else{
				var locinfo_table = data.val();
				// Update Firebase
				locationChild.update({
					"numrooms": locinfo_table["numrooms"] + 1
				});
				// Push room data
				var roomChild = locationChild.child("/rooms");
				roomChild.push().set({
					"maxseats": parseInt(req.query.maxseats),
					"roomnum": req.query.roomnum
				});
			}
		});
	}catch(err){
		// Failure response
		res.json({success:false,message:"ERROR: "+err});
		return;
	}
	// Success response
	res.json({success:true});
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
	req.session.profilestatus = 2;
	req.session.username = username;
	req.session.sessionkey = "";
	// Add user if missing
	usersref.orderByChild("user").equalTo(username).once("value", function(data){
		if(data.numChildren() === 0) {
			var userskeyref = usersref.push();
			req.session.sessionkey = userskeyref.key;
			userskeyref.set({
				user: username,
				name: "",
				admin: false
			});
			req.session.profilestatus = 0;
		}else{
			req.session.sessionkey = Object.keys(data.val())[0];
		}
		res.redirect('/profile');
	});
});
// CAS Log Out
app.get('/logout', cas.logout);


/* SERVER PORT */
server.listen(3000);
console.log("Listening on port 3000...");
