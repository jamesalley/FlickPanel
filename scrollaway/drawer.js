YUI().use('node','event','event-outside','event-flick', function (Y) {

    Y.Event.defineOutside('touchend');

    var drawer = Y.one('.drawer'),
        classTarget = Y.one('body');
    
    drawer.on('click',function() {
        //classTarget.toggleClass('drawer-closed');
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

    drawer.on('scroll',function(){
        Y.log('drawer is scrolling');
    }, Y.config.win,this);

    this._drawerStop = function() {
        //Y.log('win is scrolling');
        var yVal = Y.one('header').get('offsetHeight'),
            win = Y.config.win;
        // if the window scrolls past the height of the header...
        if (win.scrollY >= yVal) {
            drawer.setStyle('position','fixed');
            drawer.setStyle('height',win.innerHeight);
        } else {
            drawer.setStyle('position','');
        }
    }
    
    Y.on('touchmove',this._drawerStop, Y.config.win, this);
    Y.on('scroll',this._drawerStop, Y.config.win, this);
    
});
