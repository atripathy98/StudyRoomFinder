var app = angular.module('time-select', []);

app.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});

app.controller('slots',function($scope, $http) {

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
})
