YUI.add('flickPanel', function (Y) {
    /**
     *  Plug this into a page where you have a flickPanel and a main area,
     *  and you want to be able to flick the flickPanel out of the way.
     */

    function FlickPanelPlugin(config) {
        FlickPanelPlugin.superclass.constructor.apply(this, arguments);
    }

    FlickPanelPlugin.NAME = 'FlickPanelPlugin';
    FlickPanelPlugin.NS = 'FlickPanel';
    FlickPanelPlugin.PULL_TAB_MARKUP = '<div class="pullTab"><div class="gripper">Pull-tab</div></div>';
    FlickPanelPlugin.ATTRS = {
    };

    Y.extend(FlickPanelPlugin, Y.Plugin.Base, {
        initializer: function (config) {
            this.isOpen = false;
            this.deviceSupportsTouch = ("ontouchstart" in Y.config.win && !Y.UA.chrome);
            // typically the body element
            this.root = config.root || this.get('host');
            this.animateMain = config.animateMain || false;
            // typically a node representing a sidebar or drawer
            this.flickPanelNode = config.flickPanel;
            // typically a node representing main content pushed aside by flickPanel
            this.mainNode = config.main;
            this.yVal = this.flickPanelNode.getY();
            this.xPos = 0;
            this.trackingDirection = null;
            this.flickPanelNode.append(FlickPanelPlugin.PULL_TAB_MARKUP);
            this.pullTab = this.root.one('.pullTab');

            // flickPanel tracks along with input
            // also triggers toggle at end of input, so a click will also initiate toggle
            if (this.deviceSupportsTouch) {
                this.pullTab.on('gesturemovestart', this._track, this, this);
                this.pullTab.on('gesturemove', this._track, this, this);
                this.pullTab.on('gesturemoveend', this._stopTracking, this, this);
            }
            
            // also listen for a page flick
            if (this.animateMain) {
                this.root.on('flick', this._onFlick, '', this);
            }
            
            // slide into adjusted position on orientation change
            this.WINDOW_CHANGE_EVENT = ('onorientationchange' in Y.config.win) ? 'orientationchange' : 'resize';
            Y.on(this.WINDOW_CHANGE_EVENT, this._windowChange, Y.config.win, this);
            
            // flickPanel may change positioning model as page scrolls
            Y.on('touchmove', this._flickPanelScrollStop, Y.config.win, this);
            Y.on('scroll', this._flickPanelScrollStop, Y.config.win, this);

        },

        destructor: function () {
            this.pullTab.remove();
            this._closePanel();
            this.root.detach('flick', this._onFlick);
        },

        _windowChange: function () {
            /** 
             *  Window change can cause dimension and positioning changes
             *  which necessitate repositioning the flickPanel.
             *  If it's open, pop it to correct open position, otherwise close.
             */
            if (this.isOpen) {
                this._slidePanels(this.flickPanelNode.get('offsetWidth'),false);
            }
            else {
                this._slidePanels(0, false);
            }
        },

        _onFlick: function (e) {
            // Don't respond to flick events percolating through certain components
            // TO DO: pull this out and put it into conf so that FlickPanel 
            // remains clean and generalized
            if (e.target.ancestor('.yui3-scrollview-horiz')) return;
        
            // get the raw event data in order to determine angle of flick
            // event-flick only determines angles >45deg, dividing them into 
            // "x" and "y" axes
            var flick = e.flick,
                minDistance = 20,
                minVelocity = 0.1,
                preventDefault = false,
                axis = 'x',
                yMovement = (e._event.changedTouches) ? Math.abs(e._event.changedTouches[0].clientY - flick.start.clientY) : Math.abs(e.pageY - flick.start.pageY);
            if (Math.abs(flick.distance) < minDistance || Math.abs(flick.velocity) < minVelocity || flick.axis != axis) { 
                return;
            }
            // the angle can be computed using Tangent: tan(θ) = Opposite / Adjacent
            // i.e., θ = tan (-1) Opposite/Adjacent;
            // tan(flickAngle) = yMovement/flick.distance;
            // flickAngle = tan(-1) yMovement/flick.distance;
            // flickAngle = Math.atan(yMovement/flick.distance);
            // var flickAngle = Math.atan(yMovement/flick.distance);
            var flickAngle = Math.atan2(yMovement,flick.distance);
            flickAngle = parseInt(flickAngle*180/Math.PI);
            
            /** 
             *  debugging and tuning info, please leave in place.
            if (!Y.one('#devConsole')) {
                Y.one('#hd-wrap').append('<div id="devConsole" style="background:black;padding:10px;color: green;position:fixed;top: 42px;right: 0px;opacity:.9;border: 2px dashed green;">Dev console</div>');
            }
            Y.one('#devConsole').setContent(
                'flick.distance: ' + flick.distance +'px<br />\
                flick.start.clientY: ' + flick.start.clientY +'px<br />\
                e._event.changedTouches[0].clientY: ' + e._event.changedTouches[0].clientY +'px<br />\
                yMovement: ' + yMovement +'px<br />\
                flickAngle:'+ flickAngle + 'deg'); 
             */

            if (flickAngle <= 15) {
                this._openPanel();
            }
            else if (flickAngle >= 165 && flickAngle <=180) {
                this._closePanel();
            }
        },

        _slidePanels: function (xPos, useTransition) {
            //Y.log('_slidePanels ' + xPos);
            this.flickPanelNode.setStyle('-webkit-transform', 'translate3d(' + xPos + 'px,0,0)');
            if (this.animateMain) { 
                this.mainNode.setStyle('-webkit-transform', 'translate3d(' + xPos + 'px,0,0)');
            }
            if (useTransition) {
                this.flickPanelNode.setStyle('-webkit-transition', '-webkit-transform ease-out .25s');
                this.mainNode.setStyle('-webkit-transition', '-webkit-transform ease-out .25s');
                Y.later(300, this, function (){
                    this.flickPanelNode.setStyle('-webkit-transition', '');
                    this.mainNode.setStyle('-webkit-transition', '');
                }, null);
            }
        },

        _openPanel: function () {
            this._slidePanels(this.flickPanelNode.get('offsetWidth'),true);
            this.isOpen = true;
            Y.fire("flickPanel.open", {});
        },

        _closePanel: function () {
            this._slidePanels(0,true);
            this.isOpen = false;
            Y.fire("flickPanel.close", {});
        },
        
        _toggle: function () {
            // Toggle signal could be received even if this flickPanel is part of an 
            // inactive or hidden component. If so, don't bother executing.
            function isInactive (nd) {
                return (nd.getComputedStyle('display') === 'none');
            }
            // test if flickPanel is inactive, either directly or via an inactive ancestor
            if (this.flickPanelNode.ancestor(isInactive) || isInactive(this.flickPanelNode)) {
                // do nothing
            }
            else {
                if (!this.isOpen) {
                    this._openPanel();
                }
                else {
                    this._closePanel();
                }
            }
        },

        _track: function (e) {
            //Y.log(e);
            if (this.xPos < e.pageX) {
                this.trackingDirection = 'opening';
            }
            else {
                this.trackingDirection = 'closing';
            }
            this.xPos = e.pageX;
            Y.log(this.xPos + ' : ' + this.flickPanelNode.get('offsetWidth'));
            if (this.xPos > 0 && this.xPos < this.flickPanelNode.get('offsetWidth')) {
                this._slidePanels(this.xPos);
            }
        },

        _stopTracking: function (e) {
            // any e.halt is unwelcome, but it prevents unintended click events from occurring as you release your finger from the drag
            e.halt(); 
            
            /**
             *  What direction were we tracking in? It matters. If we're dragging to 
             *  the right, we want to open by default if we're past the minThreshold. 
             *  If we're swiping to the left, we want to close by default if we're 
             *  past the maxThreshold.
             */
            var flickPanelWidth = this.flickPanelNode.get('offsetWidth');
            this.xPos = e.pageX;
            var minThreshold = Math.round(flickPanelWidth/3),
                maxThreshold = flickPanelWidth-22;
            if ((this.trackingDirection === 'opening' && this.xPos > minThreshold) || this.xPos > maxThreshold) {
                this._openPanel();
            }
            else {
                this._closePanel();
            }
        },

        _flickPanelScrollStop: function () {
            // locks the panel to the top of the screen when scrolling vertically
            var fp = this.flickPanelNode,
                yVal = this.yVal,
                win = Y.config.win;
            // iOS 4.x does not support position fixed
            if (Y.UA.ios && Y.UA.ios < 5) {
                if (win.scrollY >= yVal) {
                    fp.setStyle('top',(win.scrollY-this.yVal)+'px');
                } else {
                    fp.setStyle('top','');
                }
            }
            // iOS5+ and desktop webkit support position: fixed
            else {
                if (win.scrollY >= yVal) {
                    fp.setStyle('position','fixed');
                } else {
                    fp.setStyle('position','');
                }
            }
        }
    });

    Y.FlickPanelPlugin = FlickPanelPlugin;

}, '1.0.0', {
    requires: ['node', 'event', 'event-flick', 'event-move', 'plugin']
});