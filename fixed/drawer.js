YUI().use('node','event', function (Y) {

    Y.one('.drawer').on('click',function() {
        Y.one('body').toggleClass('drawer-closed');
        //this.toggleClass('closed');
    });

});
