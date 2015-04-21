angular.module('angular.offcanvas')
    .factory('$offcanvasStack', ['$animate', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
        function ($animate, $timeout, $document, $compile, $rootScope, $$stackedMap) {

            var OPENED_OFFCANVAS_CLASS = 'offcanvas-expanded';
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
                //remove backdrop if no longer needed
                if (backdropDomEl && backdropIndex() == -1) {
                    var backdropScopeRef = backdropScope;
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