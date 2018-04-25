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
app.use('/public', express.static(__dirname + '/public'));
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
					return next();
				});
			}else{
				return res.status(401).json({success:false,message:"Invalid API Key provided or missing. Make sure to pass your key to 'apikey'."});
			}
		});
	}else{
		return res.status(401).json({success:false,message:"Unauthorized API calls."});
	}
}

// Checking if active session is available for web application
function requireActiveSession(req,res,next){
	if(req.session && req.session[cas.session_name]){
		var username = req.session[cas.session_name];
		usersref.orderByChild("user").equalTo(username).once("value", function(snapshot){
			var data = snapshot.val();
			req.userkey = Object.keys(data)[0];
			req.name = data[req.userkey]["name"];
			req.admin = data[req.userkey]["admin"];
			return next();
		});
	}else{
		return res.redirect('/authenticate');
	}
}

/* WEB APPLICATION ROUTES */
// Landing Route
app.get('/',function(req,res){
	res.render('index.ejs');
});
// Profile Route
app.get('/home',requireActiveSession,function(req,res){
	if(req.query && req.query.name){
		// If name has been sent
		var dbparams = {};
		var dbendpoint = req.userkey + "/name";
		dbparams[dbendpoint] = req.query.name;
		usersref.update(dbparams);
		return res.render('home.ejs',{name: dbparams[dbendpoint]});
	}else if(req.name === ""){
		// If name has not been set
		return res.render('setup.ejs');
	}else{
		// User profile created
		return res.render('home.ejs',{name: req.name});
	}
});

// Admin route
app.get('/admin', requireActiveSession, function(req, res) {
	if(!req.admin){
		return res.redirect("/home");
	}else{
		res.render('admin.ejs',{name: req.name});
	}
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
		return res.redirect('/home');
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
	if( !(req.query && req.query.locationkey && req.query.roomkey && req.query.timeslot && req.query.date && req.query.duration) ){
		console.log(req.query);
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var response = {};
		var dt = {
			time: parseInt(req.query.timeslot),
			date: req.query.date
		};
		var requesteddate = new Date(req.query.date);
		response["lockey"] = req.query.locationkey;
		response["roomkey"] = req.query.roomkey;
		response["user"] = req.username;
		var linkkey = "/" + response["lockey"] + "/rooms/" + response["roomkey"];
		var locationChild = locationsref.child(linkkey);
		locationChild.once("value", function(lsnap){
			if(lsnap.numChildren() === 0){
				// Failure response
				response["success"] = false;
				response["message"] = "Specified room was not found.";
				return res.status(404).json(response);
			}else{
				var val = lsnap.val();
				var openhour = val["open"];
				var closehour = val["close"];
				var maxseats = val["maxseats"];
				var duration = parseInt(req.query.duration);
				var starttime = parseInt(req.query.timeslot);
				var currentdate = new Date();
				requesteddate.setHours(starttime);
				if((currentdate - requesteddate) > 0){
					response["success"] = false;
					response["message"] = "Reservations cannot be made for the past.";
					return res.status(200).json(response);
				}else if(starttime < openhour || starttime >= closehour){
					response["success"] = false;
					response["message"] = "Requested room is not open at this time.";
					return res.status(200).json(response);
				}else{
					reservationref.orderByChild("roomkey").equalTo(response["roomkey"]).once("value", function(rsnap){
						var seats = [];
						var overlap = false;
						var userhours = 0;
						while(duration + starttime > 24){
							duration--;
						}
						for(var i=0;i<duration;i++){
							seats.push(maxseats);
						}
						rsnap.forEach(function(obj){
							var rdata = obj.val();
							if(rdata["status"] == 1 && rdata["datetime"]["date"] == req.query.date){
								var rstart = rdata["datetime"]["time"];
								var rduration = rdata["duration"];
								for(var i=0;i<rduration;i++){
									if(rstart + i >= starttime && rstart + i < starttime + duration){
										if(response["user"] === rdata["user"]){
											overlap = true;
											return;
										}
										seats[rstart+i-starttime]--;
									}
								}
								if(response["user"] === rdata["user"]){
									userhours += rduration;
								}
							}
						});
						if(overlap){
							response["success"] = false;
							response["message"] = "Requested time slot overlaps with a concurrent reservation.";
							return res.status(200).json(response);
						}else if(userhours >= 4){
							response["success"] = false;
							response["message"] = "User has reached the maximum hour limit per day.";
							return res.status(200).json(response);
						}else if(seats.includes(0)){
							response["success"] = false;
							response["message"] = "Cannot reserve this timeframe.";
							return res.status(200).json(response);
						}else{
							reservationref.push().set({
				 				lockey: response["lockey"],
				 				roomkey: response["roomkey"],
				 				user: req.username,
				 				datetime: dt,
				 				status: 1,
				 				duration: duration
				 			});
							response["success"] = true;
							response["message"] = "Room has been reserved.";
				 			return res.status(200).json(response);
						}
					});
				}
			}
			
		});
	}
});

/* NAME: /getAllLocations
 * DESCRIPTION: Returns all rooms
 */
app.get('/getAllLocations',validateAccess,function(req,res){
	locationsref.once("value", function(snapshot){
		var locations = [];
		snapshot.forEach(function(data) {
			var lockey = data.key;
	 		var val = data.val();
	 		var locinfo = {};
	 		locinfo["locname"] = val["name"];
	 		locinfo["floorplan"] = val["floorplan"];
	 		locinfo["lockey"] = lockey;
	 		locinfo["numrooms"] = val["numrooms"];
	 		locations.push(locinfo);
		});
		return res.status(200).json({success:true,data:locations});
	});
});

/* NAME: /getAllRooms
 * DESCRIPTION: Returns all rooms
 */
app.get('/getAllRooms',validateAccess,function(req,res){
	locationsref.once("value", function(snapshot){
		var rooms = [];
		snapshot.forEach(function(data) {
			var lockey = data.key;
	 		var val = data.val();
			for(var roomkey in val["rooms"]){
		        var roominfo = {};
		        roominfo["locname"] = val["name"];
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

/* NAME: /getRoomSlotsByDate
 * DESCRIPTION: Returns room slots for each hour of date requested
 */
app.get('/getRoomSlotsByDate',validateAccess,function(req,res){
	if( !(req.query && req.query.locationkey && req.query.roomkey && req.query.date) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var response = {};
		var requesteddate = new Date(req.query.date);
		var currentdate = new Date();
		response["lockey"] = req.query.locationkey;
		response["roomkey"] = req.query.roomkey;
		response["requestedat"] = Math.round(currentdate.valueOf()/1000);
		response["requesteddate"] = requesteddate.toLocaleDateString("en-US");
		response["available"] = [];
		var roomchild = locationsref.child("/"+response["lockey"]+"/rooms/"+response["roomkey"]);
		roomchild.once("value", function(snapshot){
			reservationref.orderByChild("roomkey").equalTo(response["roomkey"]).once("value", function(rsnap){
				var roomdata = snapshot.val();
				var openhour = roomdata["open"];
				var closehour = roomdata["close"];
				response["maxseats"] = roomdata["maxseats"];
				var starthour = 0;
				// Check if date requested is today
				if((currentdate - requesteddate) >= 86400000){
					response["success"] = false;
					response["message"] = "Available slots of past dates cannot be retrieved.";
					return res.status(200).json(response);
				}else if(requesteddate.getMonth() == currentdate.getMonth() && requesteddate.getDate() == currentdate.getDate() && requesteddate.getYear() == currentdate.getYear()){
					starthour = currentdate.getHours();
				}
				starthour = Math.max(openhour,starthour);
				for(var i = starthour;i<closehour;i++){
					var slot = {};
					slot["time"] = i;
					slot["seatsleft"] = response["maxseats"];
					response["available"].push(slot);
				}
				rsnap.forEach(function(data){
					var val = data.val();
					if(val["status"] === 1 && val["datetime"]["date"] === response["requesteddate"] && val["datetime"]["time"] >= starthour){
						var duration = val["duration"];
						for(var i = 0;i<duration;i++){
							var index = val["datetime"]["time"] - starthour + i;
							response["available"][index]["seatsleft"]--;
						}
					}
				});
				response["success"] = true;
				return res.status(200).json(response);
			});
		});
	}
});

/* NAME: /getReservations
 * DESCRIPTION: Returns reservations for requested user
 */
app.get('/getReservations',validateAccess,function(req,res){
	var response = {};
	response["user"] = req.username;
	response["oreservations"] = [];
	response["freservations"] = [];
	var currentdate = new Date();
	reservationref.orderByChild("user").equalTo(response["user"]).once("value", function(snapshot){
		locationsref.once("value", function(lsnap){
			var loc_table = lsnap.val();
			snapshot.forEach(function(data){
	 			var reservation = {};
		 		var val = data.val();
		 		reservation["key"] = data.key;
		 		reservation["name"] = loc_table[val["lockey"]]["name"];
		 		reservation["roomnum"] = loc_table[val["lockey"]]["rooms"][val["roomkey"]]["roomnum"];
		 		reservation["duration"] = val["duration"];
		 		reservation["date"] = val["datetime"]["date"];
		 		reservation["starttime"] = val["datetime"]["time"];
		 		reservation["status"] = val["status"];
		 		var requesteddate = new Date(reservation["date"]);
		 		requesteddate.setHours(reservation["starttime"]);
		 		if((currentdate - requesteddate) > 0){
		 			if(reservation["status"] == 1){
		 				reservation["status"] = 2;
		 				var dbparams = {};
						var dbendpoint = reservation["key"] + "/status";
						dbparams[dbendpoint] = 2;
						reservationref.update(dbparams);
		 			}
		 			response["oreservations"].push(reservation);
		 		}else{
		 			response["freservations"].push(reservation);
		 		}
				
			});
			response["success"] = true;
			return res.status(200).json(response);
		});
	});
});

/* NAME: /cancelReservation
 * DESCRIPTION: Cancels the specified reservation via key
 */
app.get('/cancelReservation',validateAccess,function(req,res){
	if( !(req.query && req.query.key) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var response = {};
		response["key"] = req.query.key;
		reservationref.orderByKey().equalTo(response["key"]).once("value", function(snapshot){
			if(snapshot.numChildren() === 0){
				response["success"] = false;
				response["message"] = "Requested reservation does not exist.";
				return res.status(200).json(response);
			}else{
				var dbparams = {};
				var dbendpoint = response["key"] + "/status";
				dbparams[dbendpoint] = 0;
				reservationref.update(dbparams);
				response["success"] = true;
				return res.status(200).json(response);
			}
		});
	}
});

/* ADMIN PRIVILEGE API CALLS */
/* NAME: /getAllReservations
 * DESCRIPTION: Returns all reservations
 */
app.get('/getAllReservations',validateAccess,function(req,res){
	if(!req.admin){
		return res.status(401).json({success:false,message:"User needs admin privileges."});
	}else{
		var response = {};
		response["oreservations"] = [];
		response["freservations"] = [];
		var currentdate = new Date();
		reservationref.once("value", function(snapshot){
			locationsref.once("value", function(lsnap){
				var loc_table = lsnap.val();
				snapshot.forEach(function(data){
		 			var reservation = {};
			 		var val = data.val();
			 		reservation["user"] = req.username;
			 		reservation["key"] = data.key;
			 		reservation["name"] = loc_table[val["lockey"]]["name"];
			 		reservation["roomnum"] = loc_table[val["lockey"]]["rooms"][val["roomkey"]]["roomnum"];
			 		reservation["duration"] = val["duration"];
			 		reservation["date"] = val["datetime"]["date"];
			 		reservation["starttime"] = val["datetime"]["time"];
			 		reservation["status"] = val["status"];
			 		var requesteddate = new Date(reservation["date"]);
			 		requesteddate.setHours(reservation["starttime"]);
			 		if((currentdate - requesteddate) > 0){
			 			if(reservation["status"] == 1){
			 				reservation["status"] = 2;
			 				var dbparams = {};
							var dbendpoint = reservation["key"] + "/status";
							dbparams[dbendpoint] = 2;
							reservationref.update(dbparams);
			 			}
			 			response["oreservations"].push(reservation);
			 		}else{
			 			response["freservations"].push(reservation);
			 		}
					
				});
				response["success"] = true;
				return res.status(200).json(response);
			});
		});
	}
});

/* NAME: /addLocation
 * DESCRIPTION: Add a new location
 */
app.get('/addLocation',validateAccess,function(req,res){
	if(!req.admin){
		return res.status(401).json({success:false,message:"User needs admin privileges."});
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

/* NAME: /addRoom
 * DESCRIPTION: Add a new room to an existing location
 */
app.get('/addRoom',validateAccess,function(req,res){
	if(!req.admin){
		return res.status(401).json({success:false,message:"User needs admin privileges."});
	}else if( !(req.query && req.query.locationkey && req.query.maxseats && req.query.roomnum && req.query.openhour && req.query.closehour) ){
		return res.status(400).json({success:false,message:"Server was unable to handle the request format."});
	}else{
		var locationkey = req.query.locationkey;
		var locationChild = locationsref.child("/"+locationkey);
		// Check if location key already exists
		locationChild.once("value", function(snapshot){
			if(snapshot.numChildren() === 0){
				// Failure response
				return res.status(404).json({success:false,message:"Specified location was not found."});
			}else{
				var locinfo_table = snapshot.val();
				// Update number of rooms
				locationChild.update({
					"numrooms": locinfo_table["numrooms"] + 1
				});
				// Push room data
				var roomChild = locationChild.child("/rooms");
				var roomkeyref = roomChild.push();
				roomkeyref.set({
					"maxseats": parseInt(req.query.maxseats),
					"roomnum": req.query.roomnum,
					"open": parseInt(req.query.openhour),
					"close": parseInt(req.query.closehour)
				});
				return res.status(200).json({success:true,data: roomkeyref.key});
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

app.get('/timeSlot', function(req, res) {
    res.render('timeslot.ejs')
});

app.get('/cf', function(req, res) {
    res.render('confirm.ejs')
});

app.get('/sus', function(req, res) {
    res.render('success.ejs')
});

// TODO need to remove it if authenticated part completed.
//EDITED AND ADDED SECTION ABOVE


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
