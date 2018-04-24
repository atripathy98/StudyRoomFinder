var app = angular.module('roomFinder', ['ui.router', 'components', 'firebase']);

// var app = angular.module('roomFinder', ['ui.router', 'components']);

// ------ config ui router -> allow pages to contain subpages
app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/user')
    $stateProvider
    .state('/user', {
        url:'/user',
        templateUrl: '/user'
    })
    .state('/select', {
        url: '/select',
        templateUrl: '/select'
    })
    .state('/timeSlot', {
        url: '/timeSlot',
        templateUrl: '/ts'
    })
    .state('/confirm', {
        url: '/confirm',
        templateUrl: '/cf'
    })
    .state('/success', {
        url: '/success',
        templateUrl: '/sus'
    })
})


app.config(function() {
    var config = {
        apiKey: "AIzaSyD0QFWeuljmeD6tMVvFY9zTGCeRszlFdb0",
        authDomain: "webscience2018.firebaseapp.com",
        databaseURL: "https://webscience2018.firebaseio.com",
        projectId: "webscience2018",
        storageBucket: "webscience2018.appspot.com",
        messagingSenderId: "240763692439"
      };

  firebase.initializeApp(config);
});

// ------ factory -> store data in the same app and let data available within different controllers
app.factory("myFactory", function() {
    var room = null;
    var time = null;
    var realdate = null
    var roomlist = null;
    var slotlist = null;
    function setRoom(data) {
        room = data;
    }
    function getRoom() {
        return room;
    }
    function setDate(data) {
        time = data;
    }
    function getDate() {
        return time;
    }
    function resetRoom() {
        room = null;;
    }
    function resetDate() {
        time = null;
    }
    function setRoomList(data) {
        roomlist = data;
    }
    function getRoomList(data) {
        return roomlist;
    }
    function setSlotList(data) {
        slotList = data;
    }
    function getSlotList(data) {
        return slotlist;
    }
    return {
        setRoom: setRoom,
        getRoom: getRoom,
        setDate: setDate,
        getDate: getDate,
        resetDate: resetDate,
        resetRoom: resetRoom,
        setRoomList: setRoomList,
        getRoomList: getRoomList,
        setSlotList: setSlotList,
        getSlotList: getSlotList
    }
})

// filter -> range
app.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});

// main page -> show user first
app.controller("myControl", function($location) {
    $location.path("/user");
});

// make new reservation -> retrieve data and store in the factory, redirect to select page
app.controller("userController", function($scope, $http, $location, myFactory) {
    $scope.resevs = [];
    $scope.loadResev = function() {
        $http({
            method: 'GET',
            url:'/getReservations'
        }).then(function(res) {
            // TODO res data needs to return et
            $scope.reservs = res.data;
            console.log($scope.resevs);
        })
    }
    $scope.newReserv = function() {
        // move to the reserve page
        $http({
            method:'GET',
            url:'/getAllRooms'
        }).then(function(res) {
            // store the list
            console.log(res.data.data);
            myFactory.setRoomList(res.data.data);
            $location.path("/select");
        })
    }
    $scope.loadResev();
})

// select page allow user to select rooms
app.controller("selectController", function($scope, $http, $location, myFactory, $firebaseObject) {
    // $scope.loc = {
    //     location: "",
    //     room: "",
    //     num: 0
    // }
    $scope.rooms = myFactory.getRoomList();
    $scope.Search = function(room) {
        // myFactory.setRoom($scope.loc);
        // // TODO request data from database
        // $http£¨{
        //     method: 'GET',
        //     url: '/locations'
        // }).then(function(res) {
        //     // TODO: show the list of data
        //     //
        //     // $scope.rooms = res.data ?
        // })
        $location.path("/timeSlot");
    }
    $scope.Choose = function(roomkey, roomnum, lockey) {
        var chosenRoom = [roomkey, roomnum, lockey];
        myFactory.setRoom(chosenRoom);
        // request the reservation data of that rooms
        // TODO!
        $location.path("/timeSlot");
    }
})

// timeslot choosing
app.controller("slotController", function($scope, $http, $location, myFactory) {
    $scope.date = new Date();
    $scope.datesx = [$scope.date.setDate($scope.date.getDate()),$scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1)];

    $scope.currSelect = null;

    $scope.chooseTime = function($event) {
        console.log($scope.datesx);
        angular.element('#'+$scope.currSelect).removeClass("active");
        var timeselect = $event.currentTarget.attributes[2].value
        if ($scope.currSelect != timeselect) {
            $scope.currSelect = timeselect;
            var id = '#'+timeselect;
            // console.log(id);
            angular.element('#'+timeselect).addClass("active");
        } else {
            $scope.currSelect = null;
        }
        // slot num, date num
        var ndate = parseInt($scope.currSelect.split('-')[1]);
        var nslot = parseInt($scope.currSelect.split('-')[0]);
        var day = new Date();
        day = day.setDate(day.getDate()+ndate);
        var chosenTime = [ndate,nslot,day]

        myFactory.setDate(chosenTime);

        console.log("chosen date " + myFactory.getDate());
        // console.log(chosenTime);

    }

    $scope.Confirm = function() {
        // TODO : to mark the chosen box
        // myFactory.setDate($scope.currSelect);
        if ($scope.currSelect != null) {
            $location.path("/confirm");
        }
        else
            alert("You need to select a time slot to confirm");
    }
    $scope.Back = function() {
        myFactory.resetRoom();
        $location.path("/selectRoom");
    }
})

app.controller("confirmController", function($scope, $http, $location, myFactory) {
    // $scope.today = new Date();
    // $scope.time = $scope.today.setDate($scope.today.getDate()+parseInt(myFactory.getDate[1]))
    $scope.room = myFactory.getRoom();
    $scope.time = myFactory.getDate();
    $scope.Success = function() {
        $http({
            method: 'GET',
            url: '/reserve',
            query: {'locationkey': $scope.room[2], 'roomkey': $scope.room[0], 'timeslot':$scope.time[1], 'date': $scope.time[0]}
        }).then(function(res){
            $location.path("/success");
        })
        // console.log(myFactory.getDate());
        // console.log(myFactory.getRoom());
        $location.path("/success");
    }


    $scope.Slot = function() {
        myFactory.resetDate();
        $location.path("/timeSlot");
    }
})

app.controller("successController", function($scope, $location) {
    $scope.BackHome = function() {
        $location.path("/user");
    }
})



/* ANGULAR JS PORTION */
/* GROUP X */

//ANGULAR MODULE
// var adminapp = angular.module('app', ['components','firebase']);
// var app = angular.module('app', []);



//FIREBASE CONFIG
// adminapp.config(function() {
//   var config = {
//     apiKey: "AIzaSyDgaFX9JRlDo22OlazgCqZUVhrIgMsxcu0",
//     authDomain: "itwstermproject.firebaseapp.com",
//     databaseURL: "https://itwstermproject.firebaseio.com",
//     projectId: "itwstermproject",
//     storageBucket: "itwstermproject.appspot.com",
//     messagingSenderId: "191753728638"
//   };
//   firebase.initializeApp(config);
// });



//ANGULAR CONTROLLER
app.controller("displayController", ["$scope", "$firebaseObject","$http",
 function($scope, $firebaseObject, $http) {
// app.controller("displayController", function($scope, $http) {
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

}]);
