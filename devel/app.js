angular.module('App', ['angular.offcanvas', 'ngAnimate'])
    .controller('TestController', function($scope, $offcanvas) {
        var instance;



        $scope.open = function(size) {
            instance = $offcanvas.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl',
                size: size,
                backdrop: false,
                closeOnOutsideClick: false,
                target: 'my-id',
                paneClass: 'test',
                //position: 'left',
                //dismissAll: false,
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


        $scope.close = function() {
            if(instance) {
                instance.closed.then(function() {
                    console.log('closed !');
                });
                instance.close();
            }
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
                paneClass: 'test2',
                //backdrop: true,
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