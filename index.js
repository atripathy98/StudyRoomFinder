/* INITIALIZE PACKAGES */
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser')
var session = require('express-session');
var CASAuthentication = require('cas-authentication');
var admin = require('firebase-admin');

/* CREATE EXPRESS APP AND SERVER */
var app = express();
var server = http.createServer(app);


/* MISC. */
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static',express.static('public'));


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
// Firebase Admins SetUp (USING TEMPORARY PROJECT)
var serviceAccount = require('./resources/serviceAccountKeyBarry.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webscience2018.firebaseio.com/",
  // Rules Option
  databaseAuthVariableOverride: null
});

// Initialize Database
var db = admin.database();
var usersref = db.ref("/webscience2018/users");
var locationsref = db.ref("/webscience2018/locations");
var reservationref = db.ref("/webscience2018/reservations");


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
		var key = req.session.username + "/name";
		data[key] = req.query.name;
		req.session.name = data[key];
		usersref.update(data);
		res.render('profile.ejs',{name: req.session.name});
	// Render profile page
	}else{
		res.render('profile.ejs',{name: req.session.name});
	}
});

// Reserve a room
app.post('/reserve',function(req,res){
 	reservationref.once("value", function(data){
		
		req.session.timehr = "12";
		req.session.timemin = "00";
		req.session.date = "04/20/2018";
		req.session.id = "00002";
		req.session.locid = "002";
		req.session.rcsid = "temporary-value";
		req.session.roomid = "002";
		req.session.status = "1";
		
		var datehead = req.session.date + req.session.timehr + req.session.timemin;
		var reservation_table = data.val();
		var reservationChild = reservationref.child("/"+ datehead);
		
		if(!(datehead in reservation_table)){
			reservationChild.set({
				
				datetime:{ 
					date: req.session.date,
					time:{ 
						hr:req.session.timehr, 
						min:req.session.timemin
					} 	
				}, 
				
				id: req.session.id,
				locid: req.session.locid,
				rcsid: req.session.rcsid,
				roomid: req.session.roomid,
				status: req.session.status
				
			});
			
		}
		else{
			
		}
		
	});
	
});


// Get all locations
app.get('/getLocations',function(req,res){
	locationsref.once("value", function(data){
		var locations_table = data.val();
		res.json(locations_table);
	});
});

// Get time slots
app.get('/getTimeSlots',function(req,res){
	locationsref.once("value", function(data){
		var reservation_table = data.val();
		res.json(reservation_table);
	});
});

// Gets profile of current user
app.get('/getProfile',function(req,res){
	res.json({success:true});
});


/* CAS APP ROUTING */
// CAS Authentication SetUp
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
	req.session.name = "";
	// Add user if missing
	usersref.once("value", function(data){
		var users_table = data.val();
		if(!(username in users_table)){
			var userChild = usersref.child("/"+username);
			userChild.set({name: "",admin: false});
			req.session.profilestatus = 0;
		}else{
			req.session.name = users_table[username]["name"];
		}
		res.redirect('/profile');
	});	
});
// CAS Log Out
app.get('/logout', cas.logout);

/* LANDING ROUTE */
app.get('/',function(req,res){
	res.render('mainpage.ejs');
});


/* SERVER PORT */
server.listen(3000);
console.log("Listening on port 3000...");