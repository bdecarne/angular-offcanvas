angular.module('angular.offcanvas')
    .directive('offcanvasBackdrop', ['$offcanvasStack', '$timeout', function ($offcanvasStack, $timeout) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/offcanvas/backdrop.html',
            compile: function (tElement, tAttrs) {
                tElement.addClass(tAttrs.backdropClass);
                return linkFn;
            }
        };

        function linkFn(scope, element, attrs) {
            scope.animate = false;

            scope.close = function (evt) {
                var offcanvas = $offcanvasStack.getTop();
                if (offcanvas && offcanvas.value.backdrop && offcanvas.value.backdrop != 'static' && (evt.target === evt.currentTarget)) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    $offcanvasStack.dismiss(offcanvas.key, 'backdrop click');
                }
            };

            //trigger CSS transitions
            $timeout(function () {
                scope.animate = true;
            });
        }
    }]);