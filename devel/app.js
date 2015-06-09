angular.module('App', ['angular.offcanvas', 'ngAnimate'])
    .controller('TestController', function($scope, $offcanvas) {
        $scope.open = function(size) {

            var instance = $offcanvas.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl',
                size: size,
                backdrop: false,
                target: 'my-id',
                dismissAll: false,
                resolve:{
                    test: function() {
                        return "1";
                    }
                }
            });

            instance.result.then(function (selectedItem) {
                //$log.info('Modal validated at: ' + new Date());
            }, function () {
                //$log.info('Modal dismissed at: ' + new Date());
            });

        };

        $scope.open2 = function(size) {

            var instance = $offcanvas.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl',
                size: size,
                backdrop: false,
                target: 'my-id2',
                dismissAll: false,
                resolve:{
                    test: function() {
                        return "2";
                    }
                }
            });

            instance.result.then(function (selectedItem) {
                //$log.info('Modal validated at: ' + new Date());
            }, function () {
                //$log.info('Modal dismissed at: ' + new Date());
            });

        };
    })
    .controller('DialogInstanceCtrl', function($scope, $offcanvas, $offcanvasInstance, test) {
        $scope.test = test;
        $scope.instance = $offcanvasInstance;
        $scope.open = function(size) {
            var instance = $offcanvas.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl',
                parent: $offcanvasInstance,
                size: size,
                backdrop: true,
                resolve:{
                    test: function() {
                        return "dfsdf";
                    }
                }
            });
        };

        //$scope.$on('modal.closing', function(event) {
        //    event.defaultPrevented = !confirm('Êtes-vous sûr ?');
        //});

    });