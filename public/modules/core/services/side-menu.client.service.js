
(function(){

    'use strict';

    angular.module('core')
        .factory('SideMenu', [
            '$location',
            '$rootScope',
            '$state',
            function ($location, $state) {


                function toggleSelectSection (section) {
                    SideMenu.openedSection = (SideMenu.openedSection === section ? null : section);
                }

                function selectPage(section, page) {
                    page && page.url && $location.path(page.url);
                    SideMenu.currentSection = section;
                    SideMenu.currentPage = page;
                }

                function isSectionSelected (section) {
                    return SideMenu.openedSection === section;

                }

                function sortByHumanName(a, b) {
                    return (a.humanName < b.humanName) ? -1 :
                        (a.humanName > b.humanName) ? 1 : 0;
                }


                function addProducts(products){

                    var url ;
                    var pages = [];
                    SideMenu.sections = [];

                    //SideMenu.sections.push({
                    //    name: 'Add product',
                    //    type: 'link',
                    //    url: 'add/product',
                    //    icon: 'glyphicon glyphicon-plus',
                    //    matcher:  'add/product'
                    //
                    //})

                    _.each(products, function(product){

                        _.each(product.dashboards, function(dashboard){

                            url = 'browse/' + product.name + '/' + dashboard.name ;
                            pages.push({
                                name: dashboard.name,
                                type: 'link',
                                url: url,
                                matcher:  product.name + '/' + dashboard.name
                            });



                        });

                        pages.push({
                            name: 'Add dashboard',
                            type: 'link',
                            url: 'add/dashboard/' + product.name,
                            icon: 'glyphicon glyphicon-plus',
                            matcher: 'add/dashboard/' + product.name
                        });

                        SideMenu.sections.push(
                            {
                                name: product.name,
                                type: 'toggle',
                                pages: pages,
                                matcher: product.name
                            }
                        );
                        /* reset pages*/
                        pages = [];
                    });
                }


                var SideMenu = {
                    sections: [],
                    toggleSelectSection: toggleSelectSection,
                    isSectionSelected: isSectionSelected ,
                    selectPage: selectPage,
                    addProducts: addProducts,
                    productFilter: ''
                };

                return SideMenu;



            }]);

})();
