YUI.add('gallery-flickpanel', function (Y) {

    'use strict';

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
    FlickPanelPlugin.WINDOW_CHANGE_EVENT = (Y.config.win.hasOwnProperty && Y.config.win.hasOwnProperty('onorientationchange')) ? 'orientationchange' : 'resize';
    FlickPanelPlugin.ATTRS = {
    };

    Y.extend(FlickPanelPlugin, Y.Plugin.Base, {
        initializer: function (config) {
            this.isOpen = false;
            this.deviceSupportsTouch = (Y.config.win.hasOwnProperty && Y.config.win.hasOwnProperty('ontouchstart'));
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
            this.supportsPositionFixed = this._supportsPositionFixed();
            this.edge = config.edge || 'w'; // N-S-E-W edges of the screen

            // flickPanel tracks along with input
            // also triggers toggle at end of input, so a click will also initiate toggle
            if (this.deviceSupportsTouch) {
                this.pullTab.on('gesturemovestart', this._track, this, this);
                this.pullTab.on('gesturemove', this._track, this, this);
                this.pullTab.on('gesturemoveend', this._stopTracking, this, this);
            }

            // Also listen for a page flick
            // Prevent on Android until we can get a good position:fixed solution in place for Android.
            // Otherwise, the user could flick open the panel while at the bottom of the page and see
            // an empty panel and wonder what is going on.
            if (this.animateMain && !Y.UA.android) {
                this.root.on('flick', this._onFlick, {
                    minDistance: 40,
                    minVelocity: 0,
                    preventDefault: false
                }, this);
            }

            // slide into adjusted position on orientation change
            this.windowListener_1 = Y.on(FlickPanelPlugin.WINDOW_CHANGE_EVENT, this._windowChange, Y.config.win, this);

            // flickPanel may change positioning model as page scrolls
            // Buggy on Android due to inconsistent touch event handling, so block it.
            if (!Y.UA.android) {
                this.windowListener_2 = Y.after('touchmove', this._handleWindowScroll, Y.config.win, this);
                this.windowListener_3 = Y.after('scroll', this._handleWindowScroll, Y.config.win, this);
            }

            // API listeners
            this.windowListener_4 = Y.on('flickpanel.toggle.click', this._toggle, this);
            this.windowListener_5 = Y.on('flickpanel.do.open', this._openPanel, this);
            this.windowListener_6 = Y.on('flickpanel.do.close', this._closePanel, this);

        },

        destructor: function () {
            this.flickPanelNode.setStyle('position', '');
            this.pullTab.remove();
            this._closePanel();
            this.pullTab.detach();
            this.root.detach('flick', this._onFlick);
            this.windowListener_1.detach();
            this.windowListener_2.detach();
            this.windowListener_3.detach();
            this.windowListener_4.detach();
            this.windowListener_5.detach();
            this.windowListener_6.detach();
        },

        _windowChange: function () {
            /**
             *  Window change can cause dimension and positioning changes
             *  which necessitate repositioning the flickPanel.
             *  If it's open, pop it to correct open position, otherwise close.
             */
            if (this.isOpen) {
                this._slidePanels(this.flickPanelNode.get('offsetWidth'), false);
            } else {
                this._slidePanels(0, false);
            }
        },

        _onFlick: function (e) {
            var flick = e.flick,
                flickAngle,
                initialTarget = e.flick.start.target,
                yMovement;

            // Don't respond to flick events percolating through certain components
            // TO DO: pull this out and put it into conf so that FlickPanel
            // remains clean and generalized
            if (initialTarget.ancestor('.yui3-scrollview-horiz') ||
                    initialTarget.hasClass('yui3-scrollview-horiz') ||
                    initialTarget.ancestor('.ignore-flicks') ||
                    initialTarget.hasClass('ignore-flicks')) {
                return;
            }

            // Get the raw event data in order to determine angle of flick.
            // The event-flick module only determines angles >45deg,
            // dividing them into "x" and "y" axes. We need better.
            yMovement = (e._event.changedTouches) ?
                    Math.abs(e._event.changedTouches[0].clientY - flick.start.clientY) :
                    Math.abs(e.pageY - flick.start.pageY);

            // the angle can be computed using Tangent:
            // tan(θ) = Opposite / Adjacent
            // tan(flickAngle) = yMovement/flick.distance
            // flickAngle = tan(-1) yMovement/flick.distance
            // flickAngle = Math.atan(yMovement/flick.distance)
            flickAngle = Math.atan2(yMovement, flick.distance);
            flickAngle = parseInt(flickAngle * 180 / Math.PI, 10);

            /**
             *  debugging and tuning info, please leave in place.
             */
            // if (!Y.one('#devConsole')) {
            //     Y.one('#hd-wrap').append('<div id="devConsole" style="background:black;padding:10px;color: green;position:fixed;top: 42px;right: 0px;opacity:.9;border: 2px dashed green;">Dev console</div>');
            // }
            // Y.one('#devConsole').setContent(
            //     'flick.distance: ' + flick.distance +'px<br />\
            //     flick.start.clientY: ' + flick.start.clientY +'px<br />\
            //     e._event.changedTouches[0].clientY: ' + e._event.changedTouches[0].clientY +'px<br />\
            //     yMovement: ' + yMovement +'px<br />\
            //     flickAngle:'+ flickAngle + 'deg');

            if (this.edge === 'w') {
                if (flickAngle <= 15) {
                    this._openPanel();
                } else if (flickAngle >= 165 && flickAngle <= 180) {
                    this._closePanel();
                }
            } else if (this.edge === 'e') {
                if (flickAngle <= 15) {
                    this._closePanel();
                } else if (flickAngle >= 165 && flickAngle <= 180) {
                    this._openPanel();
                }
            }

        },

        _slidePanels: function (xPos, useTransition) {
            var prefix,
                transitionProperty,
                transformProperty;

            if (Y.UA.webkit) {
                prefix = '-webkit-';
            } else if (Y.UA.gecko) {
                prefix = '-moz-';
            } else if (Y.UA.opera) {
                prefix = '-o-';
            } else if (Y.UA.ie) {
                prefix = '-ms-';
            } else {
                prefix = '';
            }

            transitionProperty = (Y.UA.gecko) ? 'MozTransition' : prefix + 'transition';
            transformProperty = (Y.UA.gecko) ? 'MozTransform' : prefix + 'transform';

            if (useTransition) {
                this.flickPanelNode.setStyle(transitionProperty, prefix + 'transform .25s ease-out');
                this.mainNode.setStyle(transitionProperty, prefix + 'transform .25s ease-out');
            }

            if (this.animateMain) {
                this.mainNode.setStyle(transformProperty, 'translateX(' + xPos + 'px)');
            }

            this.flickPanelNode.setStyle(transformProperty, 'translateX(' + xPos + 'px)');
        },

        _openPanel: function () {
            var movement,
                offsetWidth = this.flickPanelNode.get('offsetWidth');
            if (this.edge === 'e' || this.edge === 's') {
                movement = offsetWidth * -1;
            } else {
                movement = offsetWidth;
            }
            this._slidePanels(parseInt(movement, 10), true);
            this.isOpen = true;
            Y.fire('flickpanel.did.open', {});
        },

        _closePanel: function (useTransition) {
            if (this.isOpen === true) {
                if (useTransition === undefined) {
                    useTransition = true;
                }
                this._slidePanels(0, useTransition);
                this.isOpen = false;
                Y.fire('flickpanel.did.close', {});
            }
        },

        _toggle: function () {
            // test if flickPanel is displayed and actionable
            if (this.flickPanelNode.get('clientWidth') !== 0) {
                if (!this.isOpen) {
                    this._openPanel();
                } else {
                    this._closePanel();
                }
            }
        },

        _track: function (e) {
            if (this.xPos < e.pageX) {
                this.trackingDirection = 'opening';
            } else {
                this.trackingDirection = 'closing';
            }
            this.xPos = e.pageX;
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
            var flickPanelWidth = this.flickPanelNode.get('offsetWidth'),
                minThreshold = Math.round(flickPanelWidth / 3),
                maxThreshold = flickPanelWidth - 22;

            this.xPos = e.pageX;

            if ((this.trackingDirection === 'opening' && this.xPos > minThreshold) || this.xPos > maxThreshold) {
                this._openPanel();
            } else {
                this._closePanel();
            }
        },

        _supportsPositionFixed: function () {
            var container = document.body,
                el = document.createElement('div'),
                originalHeight,
                originalScrollTop,
                elementTop,
                isSupported;

            if (Y.UA.ios && Y.UA.ios >= 5) {
                // all iOS 5 and up support it
                return true;
            }

            if (Y.UA.android) {
                // Android implementations are buggy as hell right now
                // For instance, on Android 4.x, Chrome accordions the content when rendered, while Browser does great!
                // On older Androids, like Nexus One, the div disappears when it goes into fixed pos mode,
                // even though it supports position fixed.
                return false;
            }

            if (document.createElement && container && container.appendChild && container.removeChild) {
                if (!el.getBoundingClientRect) {
                    return null;
                }
                el.innerHTML = 'x';
                el.style.cssText = 'position:fixed;top:100px;';
                container.appendChild(el);
                originalHeight = container.style.height;
                originalScrollTop = container.scrollTop;
                container.style.height = '3000px';
                container.scrollTop = 500;
                elementTop = el.getBoundingClientRect().top;
                container.style.height = originalHeight;
                isSupported = elementTop === 100;
                container.removeChild(el);
                container.scrollTop = originalScrollTop;
                return isSupported;
            }

            return null;
        },

        _handleWindowScroll: function () {
            // locks the panel to the top of the screen when scrolling vertically
            var fp = this.flickPanelNode,
                yVal = this.yVal,
                win = Y.config.win,
                supportsPositionFixed = this.supportsPositionFixed;

            if (supportsPositionFixed) {
                // switch to position fixed
                if (win.scrollY >= yVal) {
                    fp.setStyle('position', 'fixed');
                } else {
                    fp.setStyle('position', '');
                }
            } else {
                // use javascript sticky
                if (win.scrollY >= yVal) {
                    fp.setStyle('top', (win.scrollY - this.yVal) + 'px');
                } else {
                    fp.setStyle('top', '');
                }
            }
        }
    });

    Y.FlickPanelPlugin = FlickPanelPlugin;

}, '1.0.2', {
    skinnable: false,
    requires: [
        'node',
        'event',
        'event-flick',
        'event-move',
        'plugin'
    ]
});
