var app = angular.module('roomFinder', ['ui.router']);

// ------ config ui router -> allow pages to contain subpages
app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/user');
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
        templateUrl: '/timeSlot'
    })
    .state('/confirm', {
        url: '/confirm',
        templateUrl: '/cf'
    })
    .state('/success', {
        url: '/success',
        templateUrl: '/sus'
    });
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
            $scope.oreservs = res.data.oreservations;
            $scope.freservs = res.data.freservations;
        })
    }
    $scope.newReserv = function() {
        // move to the reserve page
        $http({
            method:'GET',
            url:'/getAllRooms'
        }).then(function(res) {
            // store the list
            myFactory.setRoomList(res.data.data);
            $location.path("/select");
        });
    };
    $scope.loadResev();
})

// select page allow user to select rooms
app.controller("selectController", function($scope, $http, $location, myFactory) {
    //$scope.rooms = myFactory.getRoomList();
    $scope.rooms = myFactory.getRoomList();
    $scope.reserveRoom = function(lockey, roomkey){
        var chosenRoom = [lockey,roomkey];
        myFactory.setRoom(chosenRoom);
        // request the reservation data of that rooms
        // TODO!
        // CAUSING SOME TRANSITION OCCUR
        $location.path("/timeSlot");
    };
});

// select page allow user to select rooms
app.controller("adminController", function($scope, $http, $location, myFactory) {
    $scope.rooms = [];
    $scope.locations = [];
    $scope.getAllReservations = function(){
        $http({
            method: 'GET',
            url:'/getAllReservations'
        }).then(function(res) {
            // TODO res data needs to return
            $scope.oreservs = res.data.oreservations;
            $scope.freservs = res.data.freservations;
        });
    };
    $scope.getAllRooms = function() {
        // move to the reserve page
        $http({
            method:'GET',
            url:'/getAllRooms'
        }).then(function(res) {
            // store the list
            $scope.rooms = res.data.data;
        });
    };
    $scope.getAllLocations = function() {
        // move to the reserve page
        $http({
            method:'GET',
            url:'/getAllLocations'
        }).then(function(res) {
            // store the list
            $scope.locations = res.data.data;
        });
    };
    $scope.getAllReservations();
    $scope.getAllRooms();
    $scope.getAllLocations();
});

// timeslot choosing
app.controller("slotController", function($scope, $http, $location, myFactory){
    var currentdate = new Date();
    $scope.date = currentdate.toLocaleDateString("en-US");


    /*$scope.datesx = [$scope.date.setDate($scope.date.getDate()),$scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1), $scope.date.setDate($scope.date.getDate()+1)];

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
    }*/
});

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


app.filter('modifyTime', function() {
  return function(hour) {
    console.log(hour);
    var timestring = "";
    if(hour < 12){
        timestring += "AM";
    }else{
        timestring += "PM";
    }
    hour = hour%12;
    if(hour == 0){
        timestring = "12:00 " + timestring;
    }else{
        timestring = hour.toString()+":00 " + timestring;
    }
    return timestring;
  }

});

app.filter('modifyTime', function() {
  return function(hour) {
    var timestring = "";
    if(hour < 12){
        timestring += "AM";
    }else{
        timestring += "PM";
    }
    hour = hour%12;
    if(hour == 0){
        timestring = "12:00 " + timestring;
    }else{
        timestring = hour.toString()+":00 " + timestring;
    }
    return timestring;
  }
});

app.filter('modifyDate', function() {
  return function(date) {
    var dateobj = new Date(date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateobj.toLocaleDateString("en-US",options);
  }
});

app.filter('modifyStatus', function() {
  return function(status) {
    if(status == 1){
        return "Scheduled";
    }else if(status == 2){
        return "Completed";
    }
    return "Cancelled";
  }
});

app.filter('filterRoomSearch', function() {
  return function(data,locname,roomnum,capacity){
    var ndata = [];
    if(locname == undefined){
        locname = "";
    }
    if(roomnum == undefined){
        roomnum = "";
    }
    if(capacity == undefined || isNaN(capacity)){
        capacity = 0;
    }
    data.forEach(function(value){
        if(value["locname"].toLowerCase().includes(locname.toLowerCase()) &&
           value["roomnum"].toLowerCase().includes(roomnum.toLowerCase()) &&
           value["maxseats"] >= capacity){
            ndata.push(value);
        }
    });
    return ndata;
  }
});