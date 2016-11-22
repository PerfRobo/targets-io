'use strict';
//Dashboards service used to communicate Dashboards REST endpoints
angular.module('core').factory('ExportToPdf', [
  '$http', 'Events',
  function ($http, Events) {
    var ExportToPdf = {
      //            items : [],
      'testRunSummaryToPdf': testRunSummaryToPdf

    };
    return ExportToPdf;

    function testRunSummaryToPdf(testRunSummary, callback) {

      /* get events first */

      Events.listEventsForTestRunId(testRunSummary.productName, testRunSummary.dashboardName, testRunSummary.testRunId).success(function(events) {


        var docDefinition = {};

        docDefinition['content'] = [];

        docDefinition['pageBreakBefore'] =
            function (currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) {
              if (currentNode.headlineLevel === 1 && currentNode.id) {
                return currentNode.headlineLevel === 1 && followingNodesOnPage.length < 3 + (parseInt(currentNode.id) + 1) * 3; //Hack to deal with dynamic size of legend
              } else {
                return currentNode.headlineLevel === 1 && followingNodesOnPage.length < 4; //for normal headlines
              }
            }


        docDefinition['styles'] = {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 10, 10]

          },
          subheader: {
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 10]

          },
          metricheader: {
            fontSize: 10,
            bold: true,
            margin: [0, 10, 0, 10]

          },
          tableHeader: {
            fontSize: 8,
            bold: true,

          },
          image: {
            margin: [0, 0, 10, 10]
          },
          small: {
            fontSize: 8,
            margin: [0, 0, 10, 10]

          },
          smallNoMargin: {
            fontSize: 8,

          },
          legend: {
            fontSize: 6,
          },
          legendHeader: {
            fontSize: 6,
            bold: true
          },
          table: {
            fontSize: 8,
            margin: [0, 0, 10, 10]
          },
          bold: {
            bold: true

          }
        }

        var stack = []

        docDefinition['content'].push({text: 'Test run summary', style: 'header'});
        docDefinition['content'].push({text: 'Test run info', style: 'subheader'});

        /* create test run info table */

        var testRunInfoTable = {};
        testRunInfoTable['body'] = [];
        testRunInfoTable['body'].push([{text: 'Product', style: 'bold'}, testRunSummary.productName]);
        testRunInfoTable['body'].push([{text: 'Release', style: 'bold'}, testRunSummary.productRelease]);
        testRunInfoTable['body'].push([{text: 'Dashboard', style: 'bold'}, testRunSummary.dashboardName]);
        testRunInfoTable['body'].push([{text: 'Description', style: 'bold'}, testRunSummary.description]);
        if (testRunSummary.goal) {
          testRunInfoTable['body'].push([{text: 'Goal', style: 'bold'}, testRunSummary.goal]);
        }
        testRunInfoTable['body'].push([{text: 'Test run ID', style: 'bold'}, testRunSummary.testRunId]);
        testRunInfoTable['body'].push([{
          text: 'Period',
          style: 'bold'
        }, new Date(testRunSummary.start).toISOString().split('.')[0].replace('T', ' ') + ' - ' + new Date(testRunSummary.end).toISOString().split('.')[0].replace('T', ' ')]);
        testRunInfoTable['body'].push([{text: 'Duration', style: 'bold'}, testRunSummary.humanReadableDuration]);
        if (testRunSummary.annotations && testRunSummary.annotations !== 'None') {
          testRunInfoTable['body'].push([{text: 'Annotations', style: 'bold'}, testRunSummary.annotations]);
        }


        stack.push({
          style: 'table',
          table: testRunInfoTable,
          layout: 'noBorders'
        });

        /* Markdown */

        if (testRunSummary.markDown) {

          _.each(splitAndStyleMarkdown(testRunSummary.markDown), function (markDownLine) {

            stack.push({text: markDownLine.text, style: markDownLine.style});

          })

        }

        function splitAndStyleMarkdown(markDown) {

          var splitAndStyledMarkDownLines = [];

          var markDownLines = markDown.split('\n');

          var subheaderRegex = new RegExp('####.*');

          _.each(markDownLines, function (markDownLine) {

            /* remove all markdown characters except for headers */

            markDownLine = markDownLine.replace(/\*/g, '').replace(/\>/g, '').replace(/\`/g, '');

            if (subheaderRegex.test(markDownLine)) {

              splitAndStyledMarkDownLines.push({text: markDownLine.split('####')[1], style: 'subheader'})
            } else {

              splitAndStyledMarkDownLines.push({text: markDownLine, style: 'smallNoMargin'})
            }

          })

          return splitAndStyledMarkDownLines;
        }

        stack.push({text: 'Requirements', style: 'subheader'});

        /* create requirements table */

        if (testRunSummary.requirements.length > 0) {

          var requirementsTable = {};
          requirementsTable['body'] = [];
          requirementsTable['body'].push([{text: 'Requirement', style: 'tableHeader'}, {
            text: 'Result',
            style: 'tableHeader'
          }]);

          _.each(testRunSummary.requirements, function (requirement) {

            //requirementsTable['body'].push([{text: requirement.requirementText}, {
            //  text: (requirement.meetsRequirement) ? 'OK' : 'NOK',
            //  style: 'smallNoMargin'
            //}]);

            if(!requirement.meetsRequirement) {

              requirementsTable['body'].push([{text: requirement.requirementText}, {
                image: 'data:image/png;base64,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',
                width: 12,
                alignment: 'center'

              }]);

            }else{

              requirementsTable['body'].push([{text: requirement.requirementText}, {
                image: 'data:image/png;base64,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',
                width: 12,
                alignment: 'center'
              }]);
            }
          })

          stack.push({
            style: 'table',
            table: requirementsTable,
            layout: 'lightHorizontalLines'
          });


        }

        /* Events table */


        if (events.length > 0) {

          stack.push({text: 'Events', style: 'subheader'});

          var eventsTable = {};
          eventsTable['body'] = [];
          eventsTable['body'].push([{text: 'Event', style: 'tableHeader'}, {
            text: 'Timestamp',
            style: 'tableHeader'
          }, {text: 'Description', style: 'tableHeader'}]);

          _.each(events, function (event, i) {

            eventsTable['body'].push([{
              text: (i + 1).toString(),
              style: 'smallNoMargin'
            }, {
              text: new Date(event.eventTimestamp).toISOString().split('.')[0].replace('T', ' '),
              style: 'smallNoMargin'
            }, {text: event.eventDescription, style: 'smallNoMargin'}]);

          })


          stack.push({
            style: 'table',
            table: eventsTable,
            layout: 'lightHorizontalLines'
          });

        }


        docDefinition['content'].push(stack);

        /* Metrics */
        docDefinition['content'].push({text: 'Metrics', style: 'subheader', headlineLevel: 1});


        _.each(testRunSummary.metrics, function (metric) {

          var legendTable = {};
          legendTable['body'] = [];
          legendTable['body'].push([{text: 'Metric', style: 'legendHeader'}, {
            text: 'Min',
            style: 'legendHeader'
          }, {text: 'Max', style: 'legendHeader'}, {text: 'Avg', style: 'legendHeader'}]);

          _.each(metric.legendData, function (legendData) {

            if ((legendData.min || legendData.min === 0) && legendData.avg !== null) {
              legendTable['body'].push([{
                text: legendData.name,
                style: 'legend',
                color: rgbToHex(legendData.color).toString()
              }, {
                text: legendData.min ? legendData.min.toString() : '0',
                style: 'legend'
              }, {
                text: legendData.max ? legendData.max.toString() : '0',
                style: 'legend'
              }, {text: legendData.avg ? legendData.avg.toString() : '0', style: 'legend'}]);
            }
          })


          docDefinition['content'].push(//{
              //  stack:[

              {text: metric.alias, style: 'metricheader', headlineLevel: 1, id: metric.legendData.length},
              {text: metric.summaryText ? metric.summaryText : '', style: 'small'},
              {
                image: metric.imageGraph,
                width: 500,
                style: 'image'
              },
              {
                style: 'table',
                table: legendTable,
                layout: 'noBorders'
              }
              //    ]
              //}
          )
        })


        callback(docDefinition);

      });

      }

    function componentFromStr(numStr, percent) {
      var num = Math.max(0, parseInt(numStr, 10));
      return percent ?
          Math.floor(255 * Math.min(100, num) / 100) : Math.min(255, num);
    }

    function rgbToHex(rgb) {
      var rgbRegex = /^rgb\(\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*\)$/;
      var result, r, g, b, hex = "";
      if ( (result = rgbRegex.exec(rgb)) ) {
        r = componentFromStr(result[1], result[2]);
        g = componentFromStr(result[3], result[4]);
        b = componentFromStr(result[5], result[6]);

        hex = '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
      }
      return hex;
    }
  }
]);
