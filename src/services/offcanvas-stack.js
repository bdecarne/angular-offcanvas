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

                // if there is parent instance, extend it
                if(offcanvasInstance.parent) {
                    $offcanvasStack.extend(offcanvasInstance.parent);
                }

                // if there is any child instance, close it too
                var keys = openedWindows.keys();
                for(var i = 0; i < keys.length; i++) {
                    if(keys[i].parent == offcanvasInstance) {
                        $offcanvasStack.close(keys[i]);
                    }
                }

                //clean up the stack
                openedWindows.remove(offcanvasInstance);

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
                    keyboard: offcanvas.keyboard,
                    target: offcanvas.target
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
                    'animate': 'animate',
                    'position': offcanvas.position
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

            /**
             * Close
             *
             * @param offcanvasInstance
             * @param result
             * @returns {boolean}
             */
            $offcanvasStack.close = function (offcanvasInstance, result) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow && broadcastClosing(offcanvasWindow, result, true)) {
                    offcanvasWindow.value.deferred.resolve(result);
                    removeOffcanvasWindow(offcanvasInstance);
                    return true;
                }
                return !offcanvasWindow;
            };

            /**
             * Dismiss
             *
             * @param offcanvasInstance
             * @param reason
             * @returns {boolean}
             */
            $offcanvasStack.dismiss = function (offcanvasInstance, reason) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow && broadcastClosing(offcanvasWindow, reason, false)) {
                    offcanvasWindow.value.deferred.reject(reason);
                    removeOffcanvasWindow(offcanvasInstance);
                    return true;
                }
                return !offcanvasWindow;
            };

            /**
             * Reduce
             *
             * @param offcanvasInstance
             */
            $offcanvasStack.reduce = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if(offcanvasWindow) {
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    offcanvasDomEl.removeClass('offcanvas-opened').addClass('offcanvas-reduced');
                }
            };

            /**
             * Extend
             *
             * @param offcanvasInstance
             */
            $offcanvasStack.extend = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if(offcanvasWindow) {
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    offcanvasDomEl.removeClass('offcanvas-reduced').addClass('offcanvas-opened');
                }
            };

            /**
             * Dismiss all
             *
             * @param reason
             */
            $offcanvasStack.dismissAll = function (reason) {
                var topOffcanvas = this.getTop();
                while (topOffcanvas && this.dismiss(topOffcanvas.key, reason)) {
                    topOffcanvas = this.getTop();
                }
            };

            /**
             * Get top offcanvas
             *
             * @returns {*}
             */
            $offcanvasStack.getTop = function () {
                return openedWindows.top();
            };

            /**
             * Get instance by target id
             *
             * @param target
             * @returns {*}
             */
            $offcanvasStack.getByTarget = function (target) {
                var keys = openedWindows.keys();
                for(var i=0; i<keys.length; i++) {
                    var opened = openedWindows.get(keys[i]);
                    if(opened.value.target && opened.value.target == target) {
                        return keys[i];
                    }
                }
            };

            /**
             * Set an offcanvas to top position
             *
             * @param target
             * @returns {*}
             */
            $offcanvasStack.setTop = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if(offcanvasWindow) {
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    $timeout(function() {
                        //stackDomEl.append(offcanvasDomEl);
                        openedWindows.remove(offcanvasInstance);
                        openedWindows.add(offcanvasWindow.key, offcanvasWindow.value);
                        $offcanvasStack.resetIndexAttributes();
                    });
                }
            };

            /**
             * Set an offcanvas to top position
             *
             * @param target
             * @returns {*}
             */
            $offcanvasStack.resetIndexAttributes = function () {
                var keys = openedWindows.keys();
                for(var i=0; i<keys.length; i++) {
                    var offcanvasWindow = openedWindows.get(keys[i]);
                    var offcanvasDomEl = offcanvasWindow.value.offcanvasDomEl;
                    offcanvasDomEl.attr('index', i);
                }
            };

            /**
             * @param offcanvasInstance
             */
            $offcanvasStack.offcanvasRendered = function (offcanvasInstance) {
                var offcanvasWindow = openedWindows.get(offcanvasInstance);
                if (offcanvasWindow) {
                    offcanvasWindow.value.renderDeferred.resolve();
                }
            };

            return $offcanvasStack;
        }]);