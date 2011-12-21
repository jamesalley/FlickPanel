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
            
            this.flickPanelNode.append('<div class="pullTab"><div class="gripper">Pull-tab</div></div>');
            this.pullTab = this._root.one('.pullTab');
                                    
            this._root.on('flick', this._onFlick, '', this);

            //this.pullTab.on('click',this._toggle,this,this);

            // flickPanel tracks along with input
            // also triggers toggle at end of input, so a click will also initiate toggle
            this.pullTab.on('gesturemovestart',this._track,this,this);
            this.pullTab.on('gesturemove',this._track,this,this);
            this.pullTab.on('gesturemoveend',function(e){
                e.halt();
                //this._toggle();
            },this,this);
            
            // flickPanel may change positioning model as page scrolls
            Y.on('touchmove',this._flickPanelStop, Y.config.win, this);
            Y.on('scroll',this._flickPanelStop, Y.config.win, this);

        },
        
        destructor: function() {},
        
        _track: function(e) {
            //console.log(this.flickPanelNode.get('offsetWidth'));
            //console.log(e.pageX);
            this._toggle(true);
            var xPos = e.pageX - this.flickPanelNode.get('offsetWidth') + 11;
            if (xPos < 1) {
                this.flickPanelNode.setStyle('left',xPos+'px');
            }
        },

        _onFlick: function(e) {
            var minDistance = 20,
                minVelocity = 0.1,
                preventDefault = false,
                axis = "x";

            if (!e.flick.velocity) {return;}    // Just a tap

            // console.log(e);
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
                this._toggle(true);
            } 
            else if (flickAngle >= 165 && flickAngle <=180) {
                this._toggle(false);
            }
        },

        // Toggles showing the flickPanel. Optionally accepts an explicit show value
        _toggle: function(show) {
            if (typeof show == 'undefined') {
                show = this._root.hasClass(FlickPanelPlugin.CLOSED_CLASS);
            }

            if (show) {
                this._root.removeClass(FlickPanelPlugin.CLOSED_CLASS);
            }
            else {
                this._root.addClass(FlickPanelPlugin.CLOSED_CLASS);
            }
            
            this.flickPanelNode.setStyle('left','');
            
            // To do: tap into this custom event to record state, if desired
            Y.fire('setCookie', {}, {'show': +show}); // bool -> int
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

