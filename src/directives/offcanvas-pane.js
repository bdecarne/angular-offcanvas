angular.module('angular.offcanvas')
    .directive('offcanvasPane', ['$offcanvasStack', '$q', '$timeout', '$window', function ($offcanvasStack, $q, $timeout, $window) {
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
                element.addClass(attrs.position);

                scope.size = attrs.size;
                //element.addClass('width-' + scope.size);

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

                // observe offcanvasSize
                attrs.$observe('offcanvasSize', function (value) {
                    element.addClass(attrs.paneClass || '');
                });

                // watch index attribute
                scope.$watch(function(){
                    return element.attr('index');
                }, function(value){
                    element.css({zIndex: 1050 + value});
                });

                offcanvasRenderDeferObj.promise.then(function () {

                    $timeout(function () {
                        // eval scrollbar
                        evalScrollbar();
                        // trigger CSS transitions
                        scope.animate = true;
                    });

                    // on resize, evan scrollbar
                    angular.element($window).bind('resize', function () {
                        evalScrollbar();
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


                /**
                 * If nanoscroller jquery plugin is present, initialize in on offcanvas-body
                 */
                function evalScrollbar()
                {
                    if (typeof jQuery == "undefined" || !jQuery.isFunction(jQuery.fn.nanoScroller)) {
                        return;
                    }

                    var menuScroller = jQuery('.offcanvas-body', element);
                    if(!menuScroller.length) {
                        menuScroller = jQuery(element).wrapInner('<div class="offcanvas-body"></div>');
                        menuScroller = jQuery('.offcanvas-body', element);
                    }

                    var parent = menuScroller.parent();

                    if (parent.hasClass('nano-content') === false) {
                        menuScroller.wrap('<div class="nano"><div class="nano-content"></div></div>');
                    }

                    // Set the correct height
                    var height = $window.innerHeight - jQuery(element).find('.nano').position().top;
                    var scroller = menuScroller.closest('.nano');
                    scroller.css({height: height});

                    // Add the nanoscroller
                    scroller.nanoScroller({preventPageScrolling: true});
                }
            }
        };
    }]);