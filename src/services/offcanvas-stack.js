angular.module('angular.offcanvas')
    .factory('$offcanvasStack', ['$animate', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
        function ($animate, $timeout, $document, $compile, $rootScope, $$stackedMap) {

            var OPENED_DIALOG_CLASS = 'dialog-open';
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

            function removeModalWindow(modalInstance) {

                var body = $document.find('body').eq(0);
                var modalWindow = openedWindows.get(modalInstance).value;

                //clean up the stack
                openedWindows.remove(modalInstance);

                //if there is parent instance, extend it
                if(modalInstance.parent) {
                    $offcanvasStack.extend(modalInstance.parent);
                }

                //remove window DOM element
                removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, function() {
                    body.toggleClass(OPENED_DIALOG_CLASS, openedWindows.length() > 0);
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

                if (domEl.attr('modal-animation') && $animate.enabled()) {
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
                var modal;

                if (evt.which === 27) {
                    modal = openedWindows.top();
                    if (modal && modal.value.keyboard) {
                        evt.preventDefault();
                        $rootScope.$apply(function () {
                            $offcanvasStack.dismiss(modal.key, 'escape key press');
                        });
                    }
                }
            });

            $offcanvasStack.open = function (modalInstance, modal) {

                openedWindows.add(modalInstance, {
                    deferred: modal.deferred,
                    renderDeferred: modal.renderDeferred,
                    modalScope: modal.scope,
                    backdrop: modal.backdrop,
                    keyboard: modal.keyboard
                });

                var body = $document.find('body').eq(0),
                    currBackdropIndex = backdropIndex();

                if (currBackdropIndex >= 0 && !backdropDomEl) {
                    backdropScope = $rootScope.$new(true);
                    backdropScope.index = currBackdropIndex;
                    var angularBackgroundDomEl = angular.element('<div offcanvas-backdrop="offcanvas-backdrop"></div>');
                    angularBackgroundDomEl.attr('backdrop-class', modal.backdropClass);
                    if (modal.animation) {
                        angularBackgroundDomEl.attr('modal-animation', 'true');
                    }
                    backdropDomEl = $compile(angularBackgroundDomEl)(backdropScope);
                    body.append(backdropDomEl);
                }

                if (!stackDomEl) {
                    stackScope = $rootScope.$new(true);
                    var stackElement = angular.element('<div offcanvas-stack="offcanvas-stack"></div>');
                    stackElement.attr('stack-class', modal.stackClass);
                    stackDomEl = $compile(stackElement)(stackScope);
                    body.append(stackDomEl);
                }

                var angularDomEl = angular.element('<div offcanvas-pane="offcanvas-pane"></div>');
                angularDomEl.attr({
                    'template-url': modal.paneTemplateUrl,
                    'pane-class': modal.paneClass,
                    'size': modal.size,
                    'index': openedWindows.length() - 1,
                    'animate': 'animate'
                }).html(modal.content);
                if (modal.animation) {
                    angularDomEl.attr('modal-animation', 'true');
                }

                var modalDomEl = $compile(angularDomEl)(modal.scope);
                openedWindows.top().value.modalDomEl = modalDomEl;
                $timeout(function() {
                    stackDomEl.append(modalDomEl);
                    body.addClass(OPENED_DIALOG_CLASS);
                });
            };

            function broadcastClosing(modalWindow, resultOrReason, closing) {
                return !modalWindow.value.modalScope.$broadcast('modal.closing', resultOrReason, closing).defaultPrevented;
            }

            $offcanvasStack.close = function (modalInstance, result) {
                var modalWindow = openedWindows.get(modalInstance);
                if (modalWindow && broadcastClosing(modalWindow, result, true)) {
                    modalWindow.value.deferred.resolve(result);
                    removeModalWindow(modalInstance);
                    return true;
                }
                return !modalWindow;
            };

            $offcanvasStack.dismiss = function (modalInstance, reason) {
                var modalWindow = openedWindows.get(modalInstance);
                if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
                    modalWindow.value.deferred.reject(reason);
                    removeModalWindow(modalInstance);
                    return true;
                }
                return !modalWindow;
            };

            $offcanvasStack.reduce = function (modalInstance) {
                var modalWindow = openedWindows.get(modalInstance);
                if(modalWindow) {
                    var modalDomEl = modalWindow.value.modalDomEl;
                    modalDomEl.removeClass('offcanvas-opened').addClass('offcanvas-reduced');
                }
            };

            $offcanvasStack.extend = function (modalInstance) {
                var modalWindow = openedWindows.get(modalInstance);
                if(modalWindow) {
                    var modalDomEl = modalWindow.value.modalDomEl;
                    modalDomEl.removeClass('offcanvas-reduced').addClass('offcanvas-opened');
                }
            };

            $offcanvasStack.dismissAll = function (reason) {
                var topModal = this.getTop();
                while (topModal && this.dismiss(topModal.key, reason)) {
                    topModal = this.getTop();
                }
            };

            $offcanvasStack.getTop = function () {
                return openedWindows.top();
            };

            $offcanvasStack.modalRendered = function (modalInstance) {
                var modalWindow = openedWindows.get(modalInstance);
                if (modalWindow) {
                    modalWindow.value.renderDeferred.resolve();
                }
            };

            return $offcanvasStack;
        }]);