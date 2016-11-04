'use strict';

angular.module('products').directive('viewProduct', ViewProductDirective);

function ViewProductDirective () {

  var directive = {
    restrict: 'EA',
    templateUrl: 'modules/products/directives/product/view-product.client.view.html',
    controller: ViewProductDirectiveController
  };

  return directive;

  /* @ngInject */
  function ViewProductDirectiveController ($scope, $state, $stateParams, Products) {


    $scope.setTab = setTab;

      /* activate */
    activate();

    /* functions */

    function activate() {
      Products.get($stateParams.productName).success(function (product) {
        Products.selected = product;
        $scope.product = Products.selected;
      });

    }

    function setTab(tabIndex){

      $scope.selectedIndex = tabIndex;

    }

  }
}
