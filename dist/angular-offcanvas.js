angular.module('angular.offcanvas', []);
angular.module('angular.offcanvas')
    .directive('offcanvasAnimationClass', function () {
        return {
            compile: function (tElement, tAttrs) {
                if (tAttrs.offcanvasAnimation) {
                    tElement.addClass(tAttrs.offcanvasAnimationClass);
                }
            }
        };
    });
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
                scope.size = attrs.size || 8;
                element.addClass('width-' + scope.size);

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


                attrs.$observe('offcanvasSize', function (value) {
                    element.addClass(attrs.paneClass || '');
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
                    if (!$.isFunction($.fn.nanoScroller)) {
                        return;
                    }

                    var menuScroller = $('.offcanvas-body', element);
                    if(!menuScroller.length) {
                        menuScroller = $(element).wrapInner('<div class="offcanvas-body"></div>');
                        menuScroller = $('.offcanvas-body', element);
                    }

                    var parent = menuScroller.parent();

                    if (parent.hasClass('nano-content') === false) {
                        menuScroller.wrap('<div class="nano"><div class="nano-content"></div></div>');
                    }

                    // Set the correct height
                    var height = $window.innerHeight - $(element).find('.nano').position().top;
                    var scroller = menuScroller.closest('.nano');
                    scroller.css({height: height});

                    // Add the nanoscroller
                    scroller.nanoScroller({preventPageScrolling: true});
                }
            }
        };
    }]);
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
angular.module('angular.offcanvas')
    .directive('offcanvasTransclude', function () {
        return {
            link: function($scope, $element, $attrs, controller, $transclude) {
                $transclude($scope.$parent, function(clone) {
                    $element.empty();
                    $element.append(clone);
                });
            }
        };
    });
angular.module('angular.offcanvas')
    .factory('$offcanvasStack', ['$animate', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
        function ($animate, $timeout, $document, $compile, $rootScope, $$stackedMap) {

            var OPENED_OFFCANVAS_CLASS = 'offcanvas-opened'
            var BACKDROP_OFFCANVAS_CLASS = 'offcanvas-with-backdrop';
            var stackDomEl, stackScope;


            var backdropDomEl, backdropScope;
            var openedWindows = $$stackedMap.createNew();
            var $offcanvasStack = {};

            function backdropIndex() {
                var topBackdropIndex = -1;
                var opened = openedWindows.keys();
                for (var i = 0; i < opened.length; i++) {
                    if (openedWindows.get(opened[i]).value.backdrop) {
                        topBackdropIndex = i;
                    }
                }
                return topBackdropIndex;
            }

            $rootScope.$watch(backdropIndex, function(newBackdropIndex){
                if (backdropScope) {
                    backdropScope.index = newBackdropIndex;
                }
            });

            function removeOffcanvasWindow(offcanvasInstance) {

                var body = $document.find('body').eq(0);
                var offcanvasWindow = openedWindows.get(offcanvasInstance).value;

                //clean up the stack
                openedWindows.remove(offcanvasInstance);

                //if there is parent instance, extend it
                if(offcanvasInstance.parent) {
                    $offcanvasStack.extend(offcanvasInstance.parent);
                }

                //remove window DOM element
                removeAfterAnimate(offcanvasWindow.offcanvasDomEl, offcanvasWindow.offcanvasScope, function() {
                    body.toggleClass(OPENED_OFFCANVAS_CLASS, openedWindows.length() > 0);
                    checkRemoveBackdrop();
                });
            }

            function checkRemoveBackdrop() {
                var body = $document.find('body').eq(0);
                //remove backdrop if no longer needed
                if (backdropDomEl && backdropIndex() == -1) {
                    var backdropScopeRef = backdropScope;
                    body.removeClass(BACKDROP_OFFCANVAS_CLASS);
                    removeAfterAnimate(backdropDomEl, backdropScope, function () {
                        backdropScopeRef = null;
                    });
                    backdropDomEl = undefined;
                    backdropScope = undefined;
                }
            }

            function removeAfterAnimate(domEl, scope, done) {
                // Closing animation
                scope.animate = false;

                if (domEl.attr('offcanvas-animation') && $animate.enabled()) {
                    // transition out
                    domEl.one('$animate:close', function closeFn() {
                        $rootScope.$evalAsync(afterAnimating);
                    });
                } else {
                    // Ensure this call is async
                    $timeout(afterAnimating);
                }

                function afterAnimating() {
                    if (afterAnimating.done) {
                        return;
                    }
                    afterAnimating.done = true;

                    domEl.remove();
                    scope.$destroy();
                    if (done) {
                        done();
                    }
                }
            }

            $document.bind('keydown', function (evt) {
                var offcanvas;

                if (evt.which === 27) {
                    offcanvas = openedWindows.top();
                    if (offcanvas && offcanvas.value.keyboard) {
                        evt.preventDefault();
                        $rootScope.$apply(function () {
                            $offcanvasStack.dismiss(offcanvas.key, 'escape key press');
                        });
                    }
                }
            });

            $offcanvasStack.open = function (offcanvasInstance, offcanvas) {

                openedWindows.add(offcanvasInstance, {
                    deferred: offcanvas.deferred,
                    renderDeferred: offcanvas.renderDeferred,
                    offcanvasScope: offcanvas.scope,
                    backdrop: offcanvas.backdrop,
                    keyboard: offcanvas.keyboard
                });

                var body = $document.find('body').eq(0),
                    currBackdropIndex = backdropIndex();

                if (currBackdropIndex >= 0 && !backdropDomEl) {
                    backdropScope = $rootScope.$new(true);
                    backdropScope.index = currBackdropIndex;
                    var angularBackgroundDomEl = angular.element('<div offcanvas-backdrop="offcanvas-backdrop"></div>');
                    angularBackgroundDomEl.attr('backdrop-class', offcanvas.backdropClass);
                    if (offcanvas.animation) {
                        angularBackgroundDomEl.attr('offcanvas-animation', 'true');
                    }
                    backdropDomEl = $compile(angularBackgroundDomEl)(backdropScope);
                    body.append(backdropDomEl);
                    body.addClass(BACKDROP_OFFCANVAS_CLASS);
                }

                if (!stackDomEl) {
                    stackScope = $rootScope.$new(true);
                    var stackElement = angular.element('<div offcanvas-stack="offcanvas-stack"></div>');
                    stackElement.attr('stack-class', offcanvas.stackClass);
                    stackDomEl = $compile(stackElement)(stackScope);
                    body.append(stackDomEl);
                }

                var angularDomEl = angular.element('<div offcanvas-pane="offcanvas-pane"></div>');
                angularDomEl.attr({
                    'template-url': offcanvas.paneTemplateUrl,
                    'pane-class': offcanvas.paneClass,
                    'size': offcanvas.size,
                    'index': openedWindows.length() - 1,
                    'animate': 'animate'
                }).html(offcanvas.content);
                if (offcanvas.animation) {
                    angularDomEl.attr('offcanvas-animation', 'true');
                }

                var offcanvasDomEl = $compile(angularDomEl)(offcanvas.scope);
                openedWindows.top().value.offcanvasDomEl = offcanvasDomEl;
                $timeout(function() {
                    stackDomEl.append(offcanvasDomEl);
                    body.addClass(OPENED_OFFCANVAS_CLASS);
                });
            };

            function broadcastClosing(offcanvasWindow, resultOrReason, closing) {
                return !offcanvasWindow.value.offcanvasScope.$broadcast('offcanvas.closing', resultOrReason, closing).defaultPrevented;
            }

            $offcanvasStack.close = function (offcanvasInstance, result) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow && broadcastClosing(offcanvasWindow, result, true)) {
                    offcanvasWindow.value.deferred.resolve(result);
                    removeOffcanvasWindow(offcanvasInstance);
                    return true;
                }
                return !offcanvasWindow;
            };

            $offcanvasStack.dismiss = function (offcanvasInstance, reason) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow && broadcastClosing(offcanvasWindow, reason, false)) {
                    offcanvasWindow.value.deferred.reject(reason);
                    removeOffcanvasWindow(offcanvasInstance);
                    return true;
                }
                return !offcanvasWindow;
            };

            $offcanvasStack.reduce = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if(offcanvasWindow) {
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    offcanvasDomEl.removeClass('offcanvas-opened').addClass('offcanvas-reduced');
                }
            };

            $offcanvasStack.extend = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if(offcanvasWindow) {
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    offcanvasDomEl.removeClass('offcanvas-reduced').addClass('offcanvas-opened');
                }
            };

            $offcanvasStack.dismissAll = function (reason) {
                var topOffcanvas = this.getTop();
                while (topOffcanvas && this.dismiss(topOffcanvas.key, reason)) {
                    topOffcanvas = this.getTop();
                }
            };

            $offcanvasStack.getTop = function () {
                return openedWindows.top();
            };

            $offcanvasStack.offcanvasRendered = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow) {
                    offcanvasWindow.value.renderDeferred.resolve();
                }
            };

            return $offcanvasStack;
        }]);
angular.module('angular.offcanvas')
    .provider('$offcanvas', function () {
        var $offcanvasProvider = {
            options: {
                animation: true,
                backdrop: false, //can be also false or 'static'
                keyboard: true
            },
            $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$offcanvasStack',
                function ($injector, $rootScope, $q, $http, $templateCache, $controller, $offcanvasStack) {

                    var $offcanvas = {};

                    function getTemplatePromise(options) {
                        return options.template ? $q.when(options.template) :
                            $http.get(angular.isFunction(options.templateUrl) ? (options.templateUrl)() : options.templateUrl,
                                {cache: $templateCache}).then(function (result) {
                                    return result.data;
                                });
                    }

                    function getResolvePromises(resolves) {
                        var promisesArr = [];
                        angular.forEach(resolves, function (value) {
                            if (angular.isFunction(value) || angular.isArray(value)) {
                                promisesArr.push($q.when($injector.invoke(value)));
                            }
                        });
                        return promisesArr;
                    }

                    $offcanvas.open = function (offcanvasOptions) {

                        var offcanvasResultDeferred = $q.defer();
                        var offcanvasOpenedDeferred = $q.defer();
                        var offcanvasRenderDeferred = $q.defer();

                        //prepare an instance of a offcanvas to be injected into controllers and returned to a caller
                        var offcanvasInstance = {
                            result: offcanvasResultDeferred.promise,
                            opened: offcanvasOpenedDeferred.promise,
                            rendered: offcanvasRenderDeferred.promise,
                            close: function (result) {
                                return $offcanvasStack.close(offcanvasInstance, result);
                            },
                            dismiss: function (reason) {
                                return $offcanvasStack.dismiss(offcanvasInstance, reason);
                            }
                        };

                        // inject parent
                        if(offcanvasOptions.parent) {
                            offcanvasInstance.parent = offcanvasOptions.parent;
                        }

                        //merge and clean up options
                        offcanvasOptions = angular.extend({}, $offcanvasProvider.options, offcanvasOptions);
                        offcanvasOptions.resolve = offcanvasOptions.resolve || {};

                        //verify options
                        if (!offcanvasOptions.template && !offcanvasOptions.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(offcanvasOptions)].concat(getResolvePromises(offcanvasOptions.resolve)));


                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

                            var offcanvasScope = (offcanvasOptions.scope || $rootScope).$new();
                            offcanvasScope.$close = offcanvasInstance.close;
                            offcanvasScope.$dismiss = offcanvasInstance.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (offcanvasOptions.controller) {
                                ctrlLocals.$scope = offcanvasScope;
                                ctrlLocals.$offcanvasInstance = offcanvasInstance;
                                angular.forEach(offcanvasOptions.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(offcanvasOptions.controller, ctrlLocals);
                                if (offcanvasOptions.controllerAs) {
                                    offcanvasScope[offcanvasOptions.controllerAs] = ctrlInstance;
                                }
                            }


                            if(offcanvasInstance.parent) {
                                $offcanvasStack.reduce(offcanvasInstance.parent);
                            } else {
                                $offcanvasStack.dismissAll();
                            }


                            $offcanvasStack.open(offcanvasInstance, {
                                scope: offcanvasScope,
                                deferred: offcanvasResultDeferred,
                                renderDeferred: offcanvasRenderDeferred,
                                content: tplAndVars[0],
                                parent: offcanvasOptions.parent,
                                animation: offcanvasOptions.animation,
                                backdrop: offcanvasOptions.backdrop,
                                keyboard: offcanvasOptions.keyboard,
                                backdropClass: offcanvasOptions.backdropClass,
                                paneClass: offcanvasOptions.paneClass,
                                paneTemplateUrl: offcanvasOptions.paneTemplateUrl,
                                size: offcanvasOptions.size,
                                target: offcanvasOptions.target
                            });

                        }, function resolveError(reason) {
                            offcanvasResultDeferred.reject(reason);
                        });

                        templateAndResolvePromise.then(function () {
                            offcanvasOpenedDeferred.resolve(true);
                        }, function (reason) {
                            offcanvasOpenedDeferred.reject(reason);
                        });

                        return offcanvasInstance;
                    };

                    return $offcanvas;
                }]
        };

        return $offcanvasProvider;
    });
angular.module('angular.offcanvas')
    .factory('$$stackedMap', function () {
        return {
            createNew: function () {
                var stack = [];

                return {
                    add: function (key, value) {
                        stack.push({
                            key: key,
                            value: value
                        });
                    },
                    get: function (key) {
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                return stack[i];
                            }
                        }
                    },
                    keys: function() {
                        var keys = [];
                        for (var i = 0; i < stack.length; i++) {
                            keys.push(stack[i].key);
                        }
                        return keys;
                    },
                    top: function () {
                        return stack[stack.length - 1];
                    },
                    remove: function (key) {
                        var idx = -1;
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                idx = i;
                                break;
                            }
                        }
                        return stack.splice(idx, 1)[0];
                    },
                    removeTop: function () {
                        return stack.splice(stack.length - 1, 1)[0];
                    },
                    length: function () {
                        return stack.length;
                    }
                };
            }
        };
    });
angular.module('angular.offcanvas').run(['$templateCache', function($templateCache) {
  $templateCache.put('templates/offcanvas/backdrop.html',
    '<div class="offcanvas-backdrop" offcanvas-animation-class="fade" ng-click="close($event)" ng-class="{in: animate}"></div>');
}]);

angular.module('angular.offcanvas').run(['$templateCache', function($templateCache) {
  $templateCache.put('templates/offcanvas/pane.html',
    '<div offcanvas-render="{{$isRendered}}" class="offcanvas-pane" ng-class="{\'offcanvas-opened\': animate}" offcanvas-transclude=""></div>');
}]);

angular.module('angular.offcanvas').run(['$templateCache', function($templateCache) {
  $templateCache.put('templates/offcanvas/stack.html',
    '<div class="offcanvas"></div>');
}]);
