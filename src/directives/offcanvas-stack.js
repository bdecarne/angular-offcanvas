angular.module('angular.offcanvas')
    .directive('offcanvasStack', ['$timeout', function ($timeout) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/offcanvas/stack.html',
            compile: function (tElement, tAttrs) {
                tElement.addClass(tAttrs.stackClass);
                return linkFn;
            }
        };

        function linkFn(scope, element, attrs) {
            scope.animate = false;

            //trigger CSS transitions
            $timeout(function () {
                scope.animate = true;
            });
        }
    }]);