'use strict';

angular.module('graphs').directive('dygraph', DygraphDirective);

/* @ngInject */
function DygraphDirective ($timeout) {

  var directive = {

    restrict: 'E',
    scope: {
      metric: '='
     },
    //template: '<div flex class="dygraph-div"  style="width:100%;"><legend legend="legend" style="margin-top: 20px; margin-left: 30px;"></legend>',
    templateUrl: 'modules/graphs/directives/dygraph.client.view.html',
    controller: DygraphController,
    //
    link: function(scope, elem, attrs) {

      scope.$watch('loading', function (newVal, oldVal) {
        if (newVal !== oldVal && newVal !== true) {
          scope.graph = new Dygraph(elem.children()[0], scope.data, scope.opts);


          scope.graph.ready(function() {
            // This is called when data.csv comes back and the chart draws.
            var colors = scope.graph.getColors();

            _.each(scope.metric.legendData, function(legendItem, i){

              if(scope.metric.legendData[i].numberOfValidDatapoints > 0 ){

                scope.metric.legendData[i].color = colors[i];

              }

            })


            var annotations = scope.graph.annotations();

            _.each(scope.metric.annotations, function(annotationFromEvent){

              annotations.push(annotationFromEvent);

            })
            scope.graph.setAnnotations(annotations);


          });

        }
      })


    }
  };

  return directive;

  /* @ngInject */
  function DygraphController($scope, $state, $stateParams, $rootScope, $timeout, TestRuns, Graphite, Events) {

    $scope.selectAll = true;

    var clickDetected = false;

    TestRuns.getTestRunById($stateParams.productName, $stateParams.dashboardName, $stateParams.testRunId).success(function (testRun) {
      TestRuns.selected = testRun;
      var from = TestRuns.zoomFrom ? TestRuns.zoomFrom : TestRuns.selected.startEpoch;
      var until = TestRuns.zoomUntil ? TestRuns.zoomUntil : TestRuns.selected.endEpoch;
      $scope.loading = true;
      updateGraph(from, until, $scope.metric.targets, function (dygraphData) {

        $scope.opts = {
          //labelsDiv: 'highlight-legend',
          labels: dygraphData.labels,
          axisLabelFontSize : 12,
          //yLabelHeight: 12,
          //customBars: expectMinMax,
          //showRangeSelector: true,
          //interactionModel: Dygraph.Interaction.defaultModel,
          //clickCallback: $.proxy(this._onDyClickCallback, this),
          //connectSeparatedPoints: true,
          //dateWindow: [detailStartDateTm.getTime(), detailEndDateTm.getTime()],
          //drawCallback: $.proxy(this._onDyDrawCallback, this),
          //zoomCallback: $.proxy(this._onDyZoomCallback, this),
          //digitsAfterDecimal: 2,
          legend: 'never',
          includeZero: true,
          valueRange: [0,dygraphData.maxValue ],
          highlightCircleSize: 0,
          highlightSeriesOpts: {
            strokeWidth: 2
          },
          highlightCallback: highLightLegend,
          unhighlightCallback: unHighLightLegend,
          //ticker: Dygraph.dateTicker,
          axes: {
            x: {
              axisLabelFormatter: Dygraph.dateAxisLabelFormatter,
              valueFormatter: Dygraph.dateString_
            }
          },
          underlayCallback: function(canvas, area, g) {

            _.each($scope.metric.annotations, function(annotation){
              var bottom_left = g.toDomCoords(annotation.x, -20);
              var top_right = g.toDomCoords(annotation.x + 10000, +20);

              var left = bottom_left[0];
              var right = top_right[0];

              canvas.fillStyle = "#FF5722";
              canvas.fillRect(left, area.y, right - left, area.h);
            })
          },
          clickCallback: function(e, x, points){

            if(clickDetected) {

              clickDetected = false;
              var eventTimestamp = x;
              Events.selected.productName = $stateParams.productName;
              Events.selected.dashboardName = $stateParams.dashboardName;
              Events.selected.eventTimestamp = eventTimestamp;
              Events.selected.testRunId = $stateParams.testRunId;
              Events.selected.eventDescription = '';

              $state.go('createEvent', {
                productName: $stateParams.productName,
                dashboardName: $stateParams.dashboardName
              });


            } else {
              clickDetected = true;
              setTimeout(function() {
                clickDetected = false;
              }, 500);
            }
          }


          //yRangePad: 10,
          //labelsDivWidth: "100%"//,
          //axes : {
          //  x : {
          //    valueFormatter: Dygraph.dateString_,
          //    ticker: Dygraph.dateTicker
          //    //xValueParser: function(x) { return parseInt(x); }
          //  }
          //},
          //xValueParser: function(x) { return parseInt(x); },

        };

        $scope.data = dygraphData.data;
        $scope.metric.legendData = dygraphData.legendData;

        /* synchronyze anotations with datapoints */

        _.each(dygraphData.annotations, function(annotation){

          annotation = synchronizeWithDataPoint(annotation);
        })


        $scope.metric.annotations = dygraphData.annotations;
        $scope.loading = false;
      });
    });

    function synchronizeWithDataPoint (annotationFromEvent){

      var synchronizedAnnotationTimestamp = annotationFromEvent ;

      for(var i=0;i < $scope.data.length; i++){

        if(new Date($scope.data[i][0]).getTime() > annotationFromEvent.x){

          synchronizedAnnotationTimestamp.x = new Date($scope.data[i][0]).getTime();
          break;
        }
      }

      return synchronizedAnnotationTimestamp;
    }

    var unHighLightLegend = function(event){

      $scope.$apply(function () {
        _.each($scope.metric.legendData, function(legendItem, i){

            $scope.metric.legendData[i].highlighted = false;
        })
      });
    }
    var highLightLegend = function(event, x, points, row, seriesName){

       var hightLightedIndex = $scope.metric.legendData.map(function(legendItem){
         return legendItem.name;
       }).indexOf(seriesName);


      $scope.$apply(function () {
        _.each($scope.metric.legendData, function(legendItem, i){

         if(i === hightLightedIndex){

           $scope.metric.legendData[i].highlighted = true;

         }else{

           $scope.metric.legendData[i].highlighted = false;
         }
       })
      });
    }

    $scope.highlightSeries = function(seriesName){

      $scope.graph.setSelection(false, seriesName)
    }

    function updateGraph(from, until, targets, callback) {
      Graphite.getData(from, until, targets, 900).then(function (series) {
        if (series.data.length > 0) {
          Graphite.addEvents(series, from, until, $stateParams.productName, $stateParams.dashboardName, $stateParams.testRunId).then(function (seriesEvents) {
            callback(seriesEvents);
          });
        } else {
          callback(series);
        }
      });
    }



    $scope.updateSelectedSeries = function() {


      _.each($scope.metric.legendData, function(legendItem, i){

            $scope.graph.setVisibility(legendItem.id, legendItem.visible);

      })

    }

    $scope.setAllSeriesSelected = function(setAllSeriesTo){

      _.each($scope.metric.legendData, function(legendItem, i){

        legendItem.visible = setAllSeriesTo;

        $scope.graph.setVisibility(legendItem.id, legendItem.visible);
      })
    };
    //$scope.$watch('selectAll', function (newVal, oldVal) {
    //  if (newVal !== oldVal) {
    //
    //    _.each($scope.metric.legendData, function(legendItem, i){
    //
    //      legendItem.visible = newVal;
    //
    //    })
    //
    //  }
    //})


  };


}

