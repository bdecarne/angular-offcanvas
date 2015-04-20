angular.module('App', ['angular.dialog'])
    .controller('TestController', function($scope, $dialog) {
        $scope.open = function() {

            var dialogInstance = $dialog.open({
                templateUrl: 'myDialog.html',
                controller: 'DialogInstanceCtrl'
            });

            dialogInstance.result.then(function (selectedItem) {
                //$log.info('Modal validated at: ' + new Date());
            }, function () {
                //$log.info('Modal dismissed at: ' + new Date());
            });

        };
    })
    .controller('DialogInstanceCtrl', function($scope, $dialogInstance) {

    });