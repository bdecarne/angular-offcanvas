angular.module('angular.offcanvas')
    .provider('$offcanvas', function () {
        var $offcanvasProvider = {
            options: {
                animation: true,
                backdrop: false, //can be also false or 'static'
                keyboard: true,
                dismissAll: true,
                position: 'right'
            },
            $get: ['$injector', '$rootScope', '$q', '$http', '$compile', '$templateCache', '$controller', '$offcanvasStack',
                function ($injector, $rootScope, $q, $http, $compile, $templateCache, $controller, $offcanvasStack) {

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

                    /**
                     * prepare a canvas (compile template)
                     *
                     * @param offcanvasOptions
                     * @returns {*}
                     */
                    $offcanvas.prepare = function (offcanvasOptions) {
                        var deferred = $q.defer();

                        // inject parent
                        if(offcanvasOptions.parent) {
                            // if the parent has a position, heritate
                            if(!offcanvasOptions.position && offcanvasOptions.parent.options.position) {
                                offcanvasOptions.position = offcanvasOptions.parent.options.position;
                            }
                        }

                        //merge and clean up options
                        offcanvasOptions = angular.extend({}, $offcanvasProvider.options, offcanvasOptions);

                        //verify options
                        if (!offcanvasOptions.template && !offcanvasOptions.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }

                        getTemplatePromise(offcanvasOptions).then(function resolveSuccess(tpl) {

                            var angularDomEl = angular.element('<div offcanvas-pane="offcanvas-pane"></div>');
                            angularDomEl.attr({
                                'template-url': offcanvasOptions.paneTemplateUrl,
                                'pane-class': offcanvasOptions.paneClass,
                                'size': offcanvasOptions.size,
                                //'index': openedWindows.length() - 1,
                                'animate': 'animate',
                                'position': offcanvasOptions.position
                            }).html(tpl);
                            if (offcanvasOptions.animation) {
                                angularDomEl.attr('offcanvas-animation', 'true');
                            }

                            var compileFunc = $compile(angularDomEl);
                            offcanvasOptions.compileFunc = compileFunc;
                            deferred.resolve(offcanvasOptions);

                        }, function resolveError(reason) {
                            deferred.reject(reason);
                        });

                        return deferred.promise;
                    }

                    /**
                     * open a canvas
                     * @param offcanvasOptions
                     * @returns {*}
                     */
                    $offcanvas.open = function (offcanvasOptions) {

                        // if there is a target key, check for opened offcanvas with the same target
                        if(offcanvasOptions.target) {
                            var offcanvasInstance = $offcanvasStack.getByTarget(offcanvasOptions.target);
                            if(offcanvasInstance) {
                                $offcanvasStack.setTop(offcanvasInstance);
                                return offcanvasInstance;
                            }
                        }

                        // prepare promises
                        var offcanvasResultDeferred = $q.defer();
                        var offcanvasOpenedDeferred = $q.defer();
                        var offcanvasRenderDeferred = $q.defer();
                        var offcanvasClosedDeferred = $q.defer();

                        //prepare an instance of a offcanvas to be injected into controllers and returned to a caller
                        var offcanvasInstance = {
                            result: offcanvasResultDeferred.promise,
                            opened: offcanvasOpenedDeferred.promise,
                            rendered: offcanvasRenderDeferred.promise,
                            closed: offcanvasClosedDeferred.promise,
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

                        // attach the options to the instance
                        offcanvasInstance.options = offcanvasOptions;
                        if(offcanvasOptions.compileFunc) {
                            compileScope(offcanvasOptions);
                        } else {
                            $offcanvas.prepare(offcanvasOptions).then(function() {
                                compileScope(offcanvasOptions);
                            });
                        }

                        function compileScope(offcanvasOptions) {
                            offcanvasOptions.resolve = offcanvasOptions.resolve || {};
                            $q.all(getResolvePromises(offcanvasOptions.resolve)).then(function(vars) {
                                var offcanvasScope = (offcanvasOptions.scope || $rootScope).$new();
                                offcanvasScope.$close = offcanvasInstance.close;
                                offcanvasScope.$dismiss = offcanvasInstance.dismiss;

                                var ctrlInstance, ctrlLocals = {};
                                var resolveIter = 0;

                                //controllers
                                if (offcanvasOptions.controller) {
                                    ctrlLocals = angular.copy(vars);
                                    ctrlLocals.$scope = offcanvasScope;
                                    ctrlLocals.$offcanvasInstance = offcanvasInstance;
                                    angular.forEach(offcanvasOptions.resolve, function (value, key) {
                                        ctrlLocals[key] = vars[resolveIter++];
                                    });

                                    ctrlInstance = $controller(offcanvasOptions.controller, ctrlLocals);
                                    if (offcanvasOptions.controllerAs) {
                                        offcanvasScope[offcanvasOptions.controllerAs] = ctrlInstance;
                                    }
                                }

                                if(offcanvasInstance.parent) {
                                    $offcanvasStack.reduce(offcanvasInstance.parent);
                                } else {
                                    if(offcanvasOptions.dismissAll) {
                                        $offcanvasStack.dismissAll();
                                    }
                                }

                                $offcanvasStack.open(offcanvasInstance, {
                                    scope: offcanvasScope,
                                    deferred: offcanvasResultDeferred,
                                    renderDeferred: offcanvasRenderDeferred,
                                    closedDeferred: offcanvasClosedDeferred,
                                    compileFunc: offcanvasOptions.compileFunc,
                                    parent: offcanvasOptions.parent,
                                    animation: offcanvasOptions.animation,
                                    backdrop: offcanvasOptions.backdrop,
                                    keyboard: offcanvasOptions.keyboard,
                                    backdropClass: offcanvasOptions.backdropClass,
                                    paneClass: offcanvasOptions.paneClass,
                                    paneTemplateUrl: offcanvasOptions.paneTemplateUrl,
                                    size: offcanvasOptions.size,
                                    target: offcanvasOptions.target,
                                    position: offcanvasOptions.position,
                                    closeOnOutsideClick: offcanvasOptions.closeOnOutsideClick
                                });
                            });
                        }

                        return offcanvasInstance;
                    };

                    return $offcanvas;
                }]
        };

        return $offcanvasProvider;
    });