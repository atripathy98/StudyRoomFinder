var app = angular.module('roomFinder', ['ui.router']);

app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
    .state('/user', {
        url:'/user',
        templateUrl: '/user.html'
    })
    .state('/selectRoom', {
        url: '/selectRoom',
        templateUrl: '/select.html'
    })
    .state('/timeSlot', {
        url: '/timeSlot',
        templateUrl: '/timeslot.html'
    })
    .state('/confirm', {
        url: '/confirm',
        templateUrl: '/confirm.html'
    })
    .state('/success', {
        url: '/success',
        templateUrl: '/success.html'
    })
})


app.factory("myFactory", function() {
    var room = {}
    var time = ""
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
    return {
        setRoom: setRoom,
        getRoom: getRoom,
        setDate: setDate,
        getDate: getDate
    }
})

app.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});


app.controller("myControl", function($location) {
    $location.path("/user")
});


app.controller("userController", function($scope, $http, $location, myFactory) {
    $scope.newReserv = function() {
        // move to the reserve page
        $location.path("/selectRoom");
    }
})


app.controller("selectController", function($scope, $http, $location, myFactory) {
    $scope.Search = function(room) {
        //
        // TODO #1 store the data in the factory
        // TODO #2 redirect to the room
        $location.path("/timeSlot");
    }
})

app.controller("slotController", function($scope, $http, $location, myFactory) {
    $scope.currSelect = ""
    $scope.setName = function(day, time) {
        return day.toString()+" "+time.toString();
    }
    $scope.chooseTime = function($event) {
        var timeselect = $event.currentTarget.attributes[2].value
        // console.log(timeselect);
        // timeslot date
        var datetime = timeselect.split(" ");
        $scope.currSelect = datetime;
        console.log(datetime);
    }
    $scope.Confirm = function() {
        // TODO #1 store time slot in factory
        // TODO #2 redirect to the confirm page
        $location.path("/confirm");
    }
    $scope.Back = function() {
        $location.path("/selectRoom");
    }
})


app.controller("confirmController", function($scope, $http, $location, myFactory) {
    $scope.Success = function() {
        $location.path("/success");
    }
    $scope.Slot = function() {
        $location.path("/timeSlot");
    }
})

app.controller("successController", function($scope, $location) {
    $scope.BackHome = function() {
        $location.path("/user");
    }
})
