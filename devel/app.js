angular.module('App', ['angular.offcanvas', 'ngAnimate'])
    .controller('TestController', function($scope, $offcanvas) {
        $scope.open = function(target) {

            var instance = $offcanvas.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl',
                target: target
            });

            instance.result.then(function (selectedItem) {
                //$log.info('Modal validated at: ' + new Date());
            }, function () {
                //$log.info('Modal dismissed at: ' + new Date());
            });

        };
    })
    .controller('DialogInstanceCtrl', function($scope, $offcanvasInstance) {

    });