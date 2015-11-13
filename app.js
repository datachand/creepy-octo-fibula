(function () {


	'use strict';

	if (window.applicationCache) {
		applicationCache.addEventListener('updateready', function() {
			if (confirm('An update is available. Reload now?')) {
				applicationCache.swapCache();
				window.location.reload();
			}
		});
	}

	Offline.options = {
		checks: {xhr: {url: 'https://cdnjs.cloudflare.com/ajax/libs/offline-js/0.7.14/offline.min.js'}}
	};

	// setInterval(Offline.check, 500);

})();


var app = angular.module('creepy-octo-fibula', ['ngResource', 'ngSanitize', 'ui.router', 'firebase']);

app.constant('FIREBASE_URL', 'https://creepy-octo-fibula.firebaseio.com/');

app.run(['$rootScope', '$log', function ($rootScope, $log) {


	$log.log(Offline.state);


	if (localStorage.getItem('sync') === null) {
		$log.error("Sync does not exists");
		localStorage.setItem('sync', false);
	} else {
		var sync = localStorage.getItem('sync');
		if (sync === "true" && Offline.state === "up") {
			syncmessenger();
		}
	}

	if (localStorage.getItem('merge') === null) {
		var data = [];
		localStorage.setItem('merge', JSON.stringify(data));
	}

	if (localStorage.getItem('newdata') === null) {
		var data = [];
		localStorage.setItem('newdata', JSON.stringify(data));
	}

	if (localStorage.getItem('fuel') === null) {
		var data = [];
		localStorage.setItem('fuel', JSON.stringify(data));
	}

	if (localStorage.getItem('delete') === null) {
		var data = [];
		localStorage.setItem('delete', JSON.stringify(data));
	}


}]);

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {

	$stateProvider.state('list', {
		url: "/",
		controller: "ListController",
		templateUrl: "list.html"
	});

	$stateProvider.state('add', {
		url: "/add",
		controller: "AddController",
		templateUrl: "add.html"
	});

	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});

}]);

app.controller('ListController', ['$scope', '$log', 'ListService', function ($scope, $log, ListService) {

	if(Offline.state === "up") {
		$scope.messages = ListService.getAssets();

		ListService.getAssets().$loaded().then(function (x) {
			localStorage.setItem('merge', JSON.stringify(x));
		});

		$scope.newdatas = ListService.getLocalData();
	} else {
		$scope.messages = JSON.parse(localStorage.getItem('merge'));
		$scope.newdatas = ListService.getLocalData();
	}

	$scope.$watch(function() {
		return ListService.getMergeData();
	}, function(value) {
		if(value) {
			$scope.messages = ListService.getMergeData();
		}
	}, true);

	$scope.$watch(function() {
		return ListService.getLocalData();
	}, function(value) {
		if(value) {
			$scope.newdatas = ListService.getLocalData();
		}
	}, true);


	$scope.imagePath = function (assetid) {
		return 'images/' + assetid + '.png';
	};

	$scope.fillAsset = function (id, value) {
		ListService.updateFuelValue(id, value);
	};

	$scope.deleteAsset = function (id) {
		if (Offline.state === "up") {
			console.log("Delete Data - Online");
			localStorage.setItem('sync', false);
			ListService.deleteAsset(id);
		} else {
			console.log("Delete Data - Offline");
			localStorage.setItem('sync', true);
			var deldata = JSON.parse(localStorage.getItem('delete'));
			deldata.push(id);
			localStorage.setItem('delete', JSON.stringify(deldata));

			var merge = JSON.parse(localStorage.getItem('merge'));
			var newmerge = [];

			angular.forEach(merge, function(message, key) {
				if (message.id !== id) {
					 newmerge.push(message);
				}
			});

			localStorage.setItem('merge', JSON.stringify(newmerge));

		}
	};


}]);

app.factory('ListService', ['$firebaseArray', 'FIREBASE_URL', function ($firebaseArray, FIREBASE_URL) {

	var exports = {};
	var reference = new Firebase(FIREBASE_URL);
	reference.on("value", function(snap) {
		if (snap.val() === true) {
			alert("connected");
		} else {
			alert("not connected");
		}
	});

	exports.getAssets = function () {
		var messages = $firebaseArray(reference);
		return messages;
	};

	function guidGenerator() {
		var S4 = function() {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	};

	exports.addAsset = function (newdata) {
		var messages = $firebaseArray(reference);
		newdata.id = guidGenerator();
		console.log(newdata);
		messages.$add(newdata).then(function (argument) {
			// Saved message
		});
	};

	exports.updateFuelValue = function (id, value) {

		var data = JSON.parse(localStorage.getItem('fuel'));
		data.push({"id": id, "fuel": value});
		localStorage.setItem('fuel', JSON.stringify(data));

		if (Offline.state === "up") {
			var messages = $firebaseArray(reference);

			messages.$loaded().then(function(x) {
				angular.forEach(x, function(message, key) {
					if (message.id === id) {
						message.fuel = value;
						console.log(key, message);
						messages.$save(key).then(function (argument) {
							console.log("Saved");
							// Saved Message
						});
					}
				});
				localStorage.setItem('merge', JSON.stringify(messages));
				data = [];
				localStorage.setItem('fuel', JSON.stringify(data));
			});

			localStorage.setItem('sync', false);
		} else {

			var merge = JSON.parse(localStorage.getItem('merge'));

			angular.forEach(merge, function(message, key) {
				if (message.id === id) {
					message.fuel = value;
					console.log(key, message);
				}
			});

			localStorage.setItem('merge', JSON.stringify(merge));
			localStorage.setItem('sync', true);
		}
	};

	exports.deleteAsset = function (id) {

			var messages = $firebaseArray(reference);

			messages.$loaded().then(function(x) {
				angular.forEach(x, function(message, key) {
					if (message.id === id) {
						messages.$remove(key).then(function (argument) {
							console.log("Delete");
						});
					}
				});
			});
	};

	exports.updateAll = function () {

		var newdata = JSON.parse(localStorage.getItem('newdata'));

		angular.forEach(newdata, function (message, key) {
			exports.addAsset(message);
		});


		var empty = [];
		localStorage.setItem('newdata', JSON.stringify(empty));

		var deldata = JSON.parse(localStorage.getItem('delete'));

		angular.forEach(deldata, function (message, key) {
			exports.deleteAsset(message);
		});

		localStorage.setItem('delete', JSON.stringify(empty));

		exports.getAssets().$loaded().then(function (x) {
			localStorage.setItem('merge', JSON.stringify(x));
		});

		var fueldata = JSON.parse(localStorage.getItem('fuel'));

		if (fueldata.length > 0) {
			var messages = $firebaseArray(reference);

			messages.$loaded().then(function(x) {
				angular.forEach(fueldata, function (v, i) {
					angular.forEach(x, function(message, key) {
						if (message.id === v.id) {
							message.fuel = v.fuel;
							console.log(key, message);
							messages.$save(key).then(function (argument) {
								console.log("Saved");
								// Saved Message
							});
						}
					});
				});
				localStorage.setItem('merge', JSON.stringify(messages));
				var data = [];
				localStorage.setItem('fuel', JSON.stringify(data));
			});
		}

	};

	exports.getLocalData = function () {
		return JSON.parse(localStorage.getItem('newdata'));
	};

	exports.getMergeData = function () {
		return JSON.parse(localStorage.getItem('merge'));
	};

	return exports;

}]);

app.controller('AddController', ['$scope', '$log', 'ListService', function ($scope, $log, ListService) {
	console.log("Add");

	function guidGenerator() {
		var S4 = function() {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	};

	$scope.addAsset = function () {

		$scope.formdata.assetid = Math.floor((Math.random()*8)+1);

		if (Offline.state === "up") {
			console.log("New Data - Online");
			localStorage.setItem('sync', false);
			ListService.addAsset($scope.formdata);
		} else {
			console.log("New Data - Offline");
			$scope.formdata.id = guidGenerator();
			localStorage.setItem('sync', true);
			var newdata = JSON.parse(localStorage.getItem('newdata'));
			newdata.push($scope.formdata);
			localStorage.setItem('newdata', JSON.stringify(newdata));
		}
	};

}]);

Offline.on('confirmed-up', function () {
	console.info("Confirmed Up");

	var sync = localStorage.getItem('sync');
	if (sync === "true") {
		syncmessenger();
		console.info("Need to sync");
	}
});


Offline.on('confirmed-down', function () {
	console.info("Confirmed Down");
});

function syncmessenger() {
	Messenger().hideAll();
	var msg = Messenger().post({
		message: "Do you like to sync?",
		hideAfter: 10000,
		actions: {
			info: {
				label: 'Sync Now',
				action: function() {
					console.log("Syncing Local Data");
					angular.injector(['creepy-octo-fibula']).get('ListService').updateAll();

					localStorage.setItem('sync', false);
					Messenger().hideAll();
				}
			},
			cancel: {
				action: function() {
					return msg.cancel();
				}
			}
		}
	});
}