/* ANGULAR JS PORTION */
/* GROUP X */

//ANGULAR MODULE
var app = angular.module('app', ['components','firebase']);

//FIREBASE CONFIG
app.config(function() {
  var config = {
    apiKey: "AIzaSyDgaFX9JRlDo22OlazgCqZUVhrIgMsxcu0",
    authDomain: "itwstermproject.firebaseapp.com",
    databaseURL: "https://itwstermproject.firebaseio.com",
    projectId: "itwstermproject",
    storageBucket: "itwstermproject.appspot.com",
    messagingSenderId: "191753728638"
  };
  firebase.initializeApp(config);
});



//ANGULAR CONTROLLER
app.controller("FirebaseObjCtrl", ["$scope", "$firebaseObject",
  function($scope, $firebaseObject) {
    var ref = firebase.database().ref().child("rpiroomfinder") //.child("");
    var obj = $firebaseObject(ref);
    obj.$bindTo($scope, "data");

  }
]);