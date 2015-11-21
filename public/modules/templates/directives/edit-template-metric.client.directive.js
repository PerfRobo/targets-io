'use strict';

angular.module('templates').directive('editTemplateMetric', EditTemplateMetricDirective);

function EditTemplateMetricDirective () {

  var directive = {
    restrict: 'EA',
    templateUrl: 'modules/templates/directives/edit-template-metric.client.view.html',
    controller: EditTemplateMetricDirectiveController
  };

  return directive;

  /* @ngInject */
  function EditTemplateMetricDirectiveController ($scope, $rootScope, $state, Templates, Dashboards) {


      $scope.metric = Templates.metric;

      $scope.addTarget = function () {
          $scope.metric.targets.push('');
          $scope.graphiteTargets = $scope.defaultGraphiteTargets;
      };
      $scope.removeTarget = function (index) {
          $scope.metric.targets.splice(index, 1);
      };
      $scope.loadTags = function (query) {

          var matchedTags = [];
          _.each(Templates.selected.tags, function (tag) {
              if (tag.text.toLowerCase().match(query.toLowerCase()))
                  matchedTags.push(tag);
          });
          return matchedTags;
      };


      $scope.update = function(){

        var updateIndex = Templates.selected.metrics.map(function(metric) { return metric._id.toString(); }).indexOf('$scope.metric._id.toString()');
        Templates.selected.metrics[updateIndex] = $scope.metric;
        Templates.update(Templates.selected).success(function (template){
            Templates.selected = template;
            $state.go('viewTemplate',{templateName: template.name});
        });
      }

      $scope.cancel = function () {
          if ($rootScope.previousStateParams)
              $state.go($rootScope.previousState, $rootScope.previousStateParams);
          else
              $state.go($rootScope.previousState);
      };


  }
}