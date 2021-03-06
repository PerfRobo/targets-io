'use strict';

angular.module('templates').directive('editTemplateVariable', EditTemplateVariableDirective);

function EditTemplateVariableDirective () {

  var directive = {
    restrict: 'EA',
    templateUrl: 'modules/templates/directives/edit-template-variable.client.view.html',
    controller: EditTemplateVariableDirectiveController//,
    //controllerAs: 'ctrlEditTemplateVariable'
  };

  return directive;

  /* @ngInject */
  function EditTemplateVariableDirectiveController ($scope, $rootScope, $state, Templates, $filter) {


      $scope.update = update;
      $scope.cancel = cancel;

          /* Watches */

      $scope.$watch('variable.name', function (val) {
      $scope.variable.name = $filter('uppercase')(val);
      }, true);


      /* activate */

      activate();

      /* functions */

      function activate() {

          $scope.variable = Templates.variable;

      }

      function update(){

          var updateIndex = Templates.selected.variables.map(function(variable) { return variable._id.toString(); }).indexOf('$scope.variable._id.toString()');
          Templates.selected.variables[updateIndex] = $scope.variable;
          Templates.update(Templates.selected).success(function (template){
              Templates.selected = template;
              $state.go('viewTemplate',{templateName: template.name});
          });
      }


      function cancel() {
          if ($rootScope.previousStateParams)
              $state.go($rootScope.previousState, $rootScope.previousStateParams);
          else
              $state.go($rootScope.previousState);
      };


  }
}
