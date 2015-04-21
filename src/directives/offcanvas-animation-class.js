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