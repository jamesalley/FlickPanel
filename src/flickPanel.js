YUI.add('flickPanel', function(Y) {
    /**
     *  Plug this into a page where you have a flickPanel and a main area,
     *  and you want to be able to flick the flickPanel out of the way.
     */ 
  
    function FlickPanelPlugin(config) {
        FlickPanelPlugin.superclass.constructor.apply(this, arguments);
    }

    FlickPanelPlugin.NAME = 'FlickPanelPlugin';
    FlickPanelPlugin.NS = 'FlickPanel';
    FlickPanelPlugin.CLOSED_CLASS = 'flickPanel-closed';
    FlickPanelPlugin.ATTRS = {
    };
    
    Y.extend(FlickPanelPlugin, Y.Plugin.Base, {
        initializer: function(config) {
            // typically the body element
            this._root = (config.root) ? config.root : this.get('host');
            // typically a node representing a sidebar or drawer
            this.flickPanelNode = config.flickPanel;
            // typically a node representing main content pushed aside by flickPanel
            this.mainNode = config.main;
            this.yVal = this.flickPanelNode.getY();
            this.xPos = 0;
            this.trackingDirection = null;
            
            this.flickPanelNode.append('<div class="pullTab"><div class="gripper">Pull-tab</div></div>');
            this.pullTab = this._root.one('.pullTab');

            // flickPanel tracks along with input
            // also triggers toggle at end of input, so a click will also initiate toggle
            this.pullTab.on('gesturemovestart',this._track,this,this);
            this.pullTab.on('gesturemove',this._track,this,this);
            this.pullTab.on('gesturemoveend',this._stopTracking,this,this);
            
            // also listen for a page flick
            this._root.on('flick', this._onFlick, '', this);
            
            // slide into adjusted position on orientation change
            this.WINDOW_CHANGE_EVENT = ('onorientationchange' in Y.config.win) ? 'orientationchange':'resize';
            Y.on(this.WINDOW_CHANGE_EVENT,this._windowChange, Y.config.win, this);
            
            // flickPanel may change positioning model as page scrolls
            Y.on('touchmove',this._flickPanelStop, Y.config.win, this);
            Y.on('scroll',this._flickPanelStop, Y.config.win, this);

        },
        
        destructor: function() {},
        
        _windowChange: function() {
            /** 
             *  Window change can cause dimension and positioning changes
             *  which necessitate repositioning the flickPanel.
             *  If it's open, pop it to correct open position, otherwise close.
             */
            if (this._root.hasClass('yui3-flickPanel-open')) {
                this._slidePanels(this.flickPanelNode.get('offsetWidth'),false);
            }
            else {
                this._slidePanels(0,false);
            }
        },
        
        _onFlick: function(e) {
            var minDistance = 20,
                minVelocity = 0.1,
                preventDefault = false,
                axis = "x";

            if (!e.flick.velocity) {return;}    // Just a tap
            
            // get the raw event data in order to determine angle of flick
            // event-flick only determines angles >45deg, dividing them into 
            // "x" and "y" axes
            var flick = e.flick,
                yMovement = (e._event.changedTouches) ? Math.abs(e._event.changedTouches[0].pageY - flick.start.pageY) : Math.abs(e.pageY - flick.start.pageY);
                
            // the angle can be computed using Tangent: tan(θ) = Opposite / Adjacent
            // i.e., θ = tan (-1) Opposite/Adjacent;
            // tan(flickAngle) = yMovement/flick.distance;
            // flickAngle = tan(-1) yMovement/flick.distance;
            // flickAngle = Math.atan(yMovement/flick.distance);
            // var flickAngle = Math.atan(yMovement/flick.distance);
            var flickAngle = Math.atan2(yMovement,flick.distance);
            flickAngle = parseInt(flickAngle*180/Math.PI);
            
            /* debugging and tuning info
            if (!Y.one('#devConsole')) {
                Y.one('#hd-wrap').append('<div id="devConsole" style="background:black;padding:10px;color: green;position:fixed;top: 42px;right: 0px;opacity:.5;border: 2px dashed green;">Dev console</div>');
            }
            Y.one('#devConsole').setContent(yMovement +'px : '+ flickAngle + 'deg'); 
            */

            if (flickAngle <= 15) {
                this._slidePanels(this.flickPanelNode.get('offsetWidth'),true);
            } 
            else if (flickAngle >= 165 && flickAngle <=180) {
                this._slidePanels(0,true);
            }
        },
        
        _slidePanels: function(xPos,useTransition) {
            this.flickPanelNode.setStyle('-webkit-transform', 'translate3d(' + xPos + 'px,0,0)');
            this.mainNode.setStyle('-webkit-transform', 'translate3d(' + xPos + 'px,0,0)');
            if (useTransition) {
                this.flickPanelNode.setStyle('-webkit-transition', '-webkit-transform ease-out .25s');
                this.mainNode.setStyle('-webkit-transition', '-webkit-transform ease-out .25s');
                Y.later(300, this, function(){
                    this.flickPanelNode.setStyle('-webkit-transition', '');
                    this.mainNode.setStyle('-webkit-transition', '');
                }, null);
            }
        },
        
        _track: function(e) {
            //Y.log(e);
            if (this.xPos < e.pageX) {
                this.trackingDirection = 'opening';
            }
            else {
                this.trackingDirection = 'closing';
            }
            this.xPos = e.pageX;
            if (this.flickPanelNode.get('offsetWidth') > this.xPos && this.xPos > 0) {
                this._slidePanels(this.xPos);
            }
        },
        
        _stopTracking: function(e) {
            //e.halt();
            //Y.log('stop tracking');
            //Y.log(e);
            
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
            if (this.trackingDirection === 'opening' && this.xPos > minThreshold) {
                this._slidePanels(flickPanelWidth,true);
                this._root.replaceClass('yui3-flickPanel-closed','yui3-flickPanel-open');
            }
            else if (this.trackingDirection === 'opening' && this.xPos < minThreshold) {
                this._slidePanels(0,true);
                this._root.replaceClass('yui3-flickPanel-open','yui3-flickPanel-closed');
            }
            else if (this.trackingDirection === 'closing' && this.xPos < maxThreshold) {
                this._slidePanels(0,true);
                this._root.replaceClass('yui3-flickPanel-open','yui3-flickPanel-closed');
            }
            else {
                this._slidePanels(flickPanelWidth,true);
                this._root.replaceClass('yui3-flickPanel-closed','yui3-flickPanel-open');
            }
        },
        
        _flickPanelStop: function() {
            var fp = this.flickPanelNode,
                yVal = this.yVal,
                win = Y.config.win;
            // if the window scrolls past the height of the header, for instance...
            if (win.scrollY >= yVal) {
                fp.setStyle('position','fixed');
                fp.setStyle('height',win.innerHeight);
            } else {
                fp.setStyle('position','');
            }
        }
    });
    
    Y.FlickPanelPlugin = FlickPanelPlugin;
    
}, '1.0.0', {
    requires: ['node', 'event', 'event-flick', 'event-move', 'plugin']
});

