(function () {

	if (window.applicationCache) {
		applicationCache.addEventListener('updateready', function() {
			if (confirm('An update is available. Reload now?')) {
				applicationCache.swapCache();
				window.location.reload();
			}
		});
	}

})();


'use strict';

var app = angular.module('creepy-octo-fibula', ['ngResource', 'ngSanitize', 'ui.router', 'firebase']);

app.constant('FIREBASE_URL', 'https://creepy-octo-fibula.firebaseio.com/');

app.run(['$rootScope', '$log', function ($rootScope, $log) {
	$log.log(Offline.state);

	localforage.setDriver(localforage.LOCALSTORAGE);

	localforage.getItem('sync').then(function(value) {
		if (value === null) {
			$log.error("Sync does not exists");
			localforage.setItem('sync', false, function (err, value) {
				console.log(value);
			});
		} else {
			localforage.getItem('sync').then(function(value) {
				if (value === true) {

				} else {

				}
			});
		}
	});

	localforage.getItem('merge').then(function(value) {
		if (value === null) {
			var data = [];
			localforage.setItem('merge', JSON.stringify(data), function (err, value) {
				console.log(value);
			});
		} else {
			localforage.getItem('sync').then(function (err, value) {
				if(value) {
					syncmessenger();
				}
			});
		}
	});


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
			localforage.setItem('merge', JSON.stringify(x), function (err, value) {
				console.log("Synced Pull Data ", value);
			});
		});
	} else {
		localforage.getItem('merge').then(function (err, value) {
			$scope.messages = JSON.parse(value);
		});
	}


	$scope.imagePath = function (assetid) {
		return 'images/' + assetid + '.png';
	};

	$scope.fillAsset = function (id, value) {
		ListService.updateFuelValue(id, value);
	};

	$scope.deleteAsset = function (id) {
		ListService.deleteAsset(id);
	};

}]);

app.factory('ListService', ['$firebaseArray', 'FIREBASE_URL', function ($firebaseArray, FIREBASE_URL) {

	var exports = {};
	var reference = new Firebase(FIREBASE_URL);

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


		localforage.setItem('merge', function (err, value) {
			console.log(value);
		});

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
			});

			localforage.setItem('sync', false, function (err, value) {
				console.log(value);
			});
		} else {
			localforage.setItem('sync', true, function (err, value) {
				console.log(value);
			});

			localforage.setItem('merge', function (err, value) {
				console.log(value);
			});
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

	return exports;

}]);

app.controller('AddController', ['$scope', '$log', 'ListService', function ($scope, $log, ListService) {
	console.log("Add");

	$scope.addAsset = function () {
		$scope.formdata.assetid = Math.floor((Math.random()*8)+1);
		ListService.addAsset($scope.formdata);
	};

}]);

Offline.on('confirmed-up', function () {
	console.info("Confirmed Up");

	localforage.getItem('sync').then(function(value) {
		if (value) {
			syncmessenger();
			console.info("Need to sync");
		} else {
		}
	});

});

Offline.on('confirmed-down', function () {
	console.info("Confirmed Down");
});

function syncmessenger() {
	var msg = Messenger().post({
		message: "Do you like to sync?",
		hideAfter: 10000,
		actions: {
			info: {
				label: 'Sync Now',
				action: function() {
					console.log("Syncing Local Data");
					var senddata = JSON.parse(localStorage.getItem('local-data'));
					senddata.sync = false;
					updateServerData(senddata);
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