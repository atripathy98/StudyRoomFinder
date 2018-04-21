/* ANGULAR JS PORTION */
/* GROUP X */

//ANGULAR MODULE
//var app = angular.module('app', ['components','firebase']);
var app = angular.module('app', []);


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
//app.controller("FirebaseObjCtrl", ["$scope", "$firebaseObject",
//  function($scope, $firebaseObject) {
app.controller("displayController", function($scope, $http) {
    //var ref = firebase.database().ref().child("rpiroomfinder") //.child("");
    //var obj = $firebaseObject(ref);
    //obj.$bindTo($scope, "data");

    $scope.reserve = function() {
      //CHECK IF FIELDS HAVE ALL BEEN SET
      $http({
        method: 'GET',
        url: '/reserve',
        params: $scope.formData
      }).then(function(response) {
          console.log(response.data);
          $scope.formData = {};
      }, function errorCallback(response) {
          //ERROR STREAMING
      });
    };

    $scope.addLocation = function() {
      //CHECK IF FIELDS HAVE ALL BEEN SET
      $http({
        method: 'GET',
        url: '/addLocation',
        params: $scope.form2Data
      }).then(function(response) {
          console.log(response.data);
          $scope.form2Data = {};
      }, function errorCallback(response) {
          //ERROR STREAMING
      });
    };

    $scope.addRoom = function() {
      //CHECK IF FIELDS HAVE ALL BEEN SET
      $http({
        method: 'GET',
        url: '/addRoom',
        params: $scope.form3Data
      }).then(function(response) {
          console.log(response.data);
          $scope.form3Data = {};
      }, function errorCallback(response) {
          //ERROR STREAMING
      });
    };

});