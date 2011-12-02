YUI().use('node','event','event-outside','event-flick', function (Y) {

    Y.Event.defineOutside('touchend');

    var drawer = Y.one('.drawer'),
        classTarget = Y.one('body');
    
    drawer.on('click',function() {
        classTarget.toggleClass('drawer-closed');
        //this.toggleClass('closed');
    });
    
    drawer.on('clickoutside',function(){
        classTarget.addClass('drawer-closed');
    });
    
    classTarget.on('flick',function(e){
        var flick = e.flick;
        if (flick.axis === 'x') {
            if (flick.distance > 10) {
                classTarget.removeClass('drawer-closed');
            } 
            else if (flick.distance < -10) {
                classTarget.addClass('drawer-closed');
            } 
        }
    
    });

});
