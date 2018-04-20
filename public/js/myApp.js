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
    function resetRoom() {
        var room = {};
    }
    function resetDate() {
        var time = "";
    }
    return {
        setRoom: setRoom,
        getRoom: getRoom,
        setDate: setDate,
        getDate: getDate,
        resetDate: resetDate,
        resetRoom: resetRoom
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
    $scope.loc = {
        location: "",
        room: "",
        num: 0
    }
    $scope.rooms = []
    $scope.Search = function(room) {
        myFactory.setRoom($scope.loc);
        // TODO request data from database

        $http£¨{
            method: 'GET',
            url: '/locations'
        }).then(function(res) {
            // TODO: show the list of data
            //
            // $scope.rooms = res.data ?
        })
        // TODO delete this later, move to reserve function
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
        var datetime = timeselect.split(" ");
        $scope.currSelect = datetime;
        // console.log(datetime);
    }
    $scope.Confirm = function() {
        // TODO : to mark the chosen box
        myFactory.setDate($scope.currSelect);
        $location.path("/confirm");
    }
    $scope.Back = function() {
        myFactory.resetRoom();
        $location.path("/selectRoom");
    }
})


app.controller("confirmController", function($scope, $http, $location, myFactory) {
    $scope.Success = function() {
        $http({
            method: 'POST',
            url: '/reserve',
            data: myFactory......
        }).then(function(res) {
            // TODO: send the reservation to the user
            // if success direct to success page
            $location.path("/success");
        })

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
