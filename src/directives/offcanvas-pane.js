angular.module('angular.offcanvas')
    .directive('offcanvasPane', ['$offcanvasStack', '$q', '$timeout', function ($offcanvasStack, $q, $timeout) {
        return {
            restrict: 'EA',
            scope: {
                index: '@',
                animate: '='
            },
            replace: true,
            transclude: true,
            templateUrl: function(tElement, tAttrs) {
                return tAttrs.templateUrl || 'templates/offcanvas/pane.html';
            },
            link: function (scope, element, attrs) {
                element.addClass(attrs.paneClass || '');
                scope.size = attrs.size;

                /*scope.close = function (evt) {
                    var offcanvas = $offcanvasStack.getTop();
                    if (offcanvas) {
                        $offcanvasStack.dismiss(offcanvas.key, 'backdrop click');
                    }
                };*/


                // This property is only added to the scope for the purpose of detecting when this directive is rendered.
                // We can detect that by using this property in the template associated with this directive and then use
                // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
                scope.$isRendered = true;

                // Deferred object that will be resolved when this offcanvas is render.
                var offcanvasRenderDeferObj = $q.defer();
                // Observe function will be called on next digest cycle after compilation, ensuring that the DOM is ready.
                // In order to use this way of finding whether DOM is ready, we need to observe a scope property used in offcanvas's template.
                attrs.$observe('offcanvasRender', function (value) {
                    if (value == 'true') {
                        offcanvasRenderDeferObj.resolve();
                    }
                });

                offcanvasRenderDeferObj.promise.then(function () {

                    // trigger CSS transitions
                    $timeout(function () {
                        scope.animate = true;
                    });

                    var inputsWithAutofocus = element[0].querySelectorAll('[autofocus]');
                    /**
                     * Auto-focusing of a freshly-opened offcanvas element causes any child elements
                     * with the autofocus attribute to lose focus. This is an issue on touch
                     * based devices which will show and then hide the onscreen keyboard.
                     * Attempts to refocus the autofocus element via JavaScript will not reopen
                     * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
                     * the offcanvas element if the offcanvas does not contain an autofocus element.
                     */
                    if (inputsWithAutofocus.length) {
                        inputsWithAutofocus[0].focus();
                    } else {
                        element[0].focus();
                    }

                    // Notify {@link $dialogStack} that offcanvas is rendered.
                    var offcanvas = $offcanvasStack.getTop();
                    if (offcanvas) {
                        $offcanvasStack.offcanvasRendered(offcanvas.key);
                    }
                });
            }
        };
    }]);