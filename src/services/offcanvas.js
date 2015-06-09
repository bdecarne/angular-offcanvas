angular.module('angular.offcanvas')
    .provider('$offcanvas', function () {
        var $offcanvasProvider = {
            options: {
                animation: true,
                backdrop: false, //can be also false or 'static'
                keyboard: true,
                dismissAll: true
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
                                if(offcanvasOptions.dismissAll) {
                                    $offcanvasStack.dismissAll();
                                }
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