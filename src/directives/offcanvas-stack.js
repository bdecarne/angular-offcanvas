angular.module('angular.offcanvas')
    .directive('offcanvasStack', [function () {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/offcanvas/stack.html'
        };
    }]);