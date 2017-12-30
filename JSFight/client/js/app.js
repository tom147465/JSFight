var myApp = angular.module('indexModule', ['ngRoute', 'userCtrl']);

myApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: '../template/login.html',
            controller: 'loginController'
        })
		.when('/regist', {
            templateUrl: '../template/regist.html',
            controller: 'registController'
        })
        .when('/login', {
            templateUrl: '../template/login.html',
            controller: 'loginController'
        })
        .when('/gameRoom', {
            templateUrl: '../template/gameRoom.html'
        })

		console.log('route');
    $locationProvider.html5Mode(true);
}]);
