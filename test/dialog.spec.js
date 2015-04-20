describe('$dialog', function () {
    beforeEach(module('angular.dialog'));
    beforeEach(module(function(_$dialogProvider_){
        $dialogProvider = _$dialogProvider_;
    }));

    beforeEach(inject(function (_$rootScope_, _$document_, _$compile_, _$templateCache_, _$timeout_, _$q_, _$dialog_) {
        $rootScope = _$rootScope_;
        $document = _$document_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
        $timeout = _$timeout_;
        $q = _$q_;
        $dialog = _$dialog_;
    }));

    function open(options) {
        var dialog = $dialog.open(options);
        $rootScope.$digest();
        return dialog;
    }

    describe('basic scenarios with default options', function () {
        it('should open and dismiss a modal with a minimal set of options', function () {
            var modal = open({template: '<div>Content</div>'});
            expect($document).toHaveModalsOpen(1);
        });

    });
});