'use strict';

module.exports = {
	app: {
		title: 'targets-io',
		description: 'Performance test dashboard',
		keywords: 'MongoDB, Express, AngularJS, Node.js'
	},
	graphiteHost: 'http://localhost:8090',
	graphiteRetentionPeriod: '90d', /*90 days*/
	db: 'mongodb://mongodb/targets-io-dev',
	memcachedHost: [ 'localhost:11211'],
    port: process.env.PORT || 3000,
	templateEngine: 'swig',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
			css: [
                'public/css/style.css',
                'public/lib/components-font-awesome/css/font-awesome.min.css',
				'public/lib/bootstrap/dist/css/bootstrap.min.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.min.css',
                'public/lib/angular-busy/dist/angular-busy.css',
                'public/lib/ng-table/dist/ng-table.css',
                'public/lib/ng-tags-input/ng-tags-input.min.css',
				'public/lib/angular-ui-bootstrap-datetimepicker/datetimepicker.css',
				'public/lib/angular-material/angular-material.min.css'
			],
			js: [
				'public/lib/angular/angular.min.js',
				'public/lib/angular-aria/angular-aria.min.js',
				'public/lib/angular-animate/angular-animate.min.js',
				'public/lib/angular-material/angular-material.min.js',
                'public/lib/angular-resource/angular-resource.min.js',
				'public/lib/angular-ui-router/release/angular-ui-router.min.js',
				'public/lib/angular-ui-utils/ui-utils.min.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.min.js',
                'public/lib/moment/moment.js',
                'public/lib/angular-spinners/dist/angular-spinners.js',
                'public/lib/angular-busy/dist/angular-busy.js',
                'public/lib/ng-table/dist/ng-table.js',
                'public/lib/ng-tags-input/ng-tags-input.min.js',
                'public/lib/underscore/underscore-min.js',
                'https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js',
                'public/lib/highstock-release/highstock.js',
                'public/lib/highcharts-ng/dist/highcharts-ng.min.js',
				'public/lib/highstock-release/exporting.js',
                'public/lib/angular-ui-bootstrap-datetimepicker/datetimepicker.js',
				'public/lib/ng-clip/dest/ng-clip.min.js',
				'public/lib/zeroclipboard/dist/ZeroClipboard.min.js'

			]
		},
		css: [
			'public/modules/**/css/*.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	}
};
