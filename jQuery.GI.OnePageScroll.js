/*!
 *
 * Version 0.0.2
 * This class could be used to create a single page scroll website loading each section via ajax
 * Copyright Gold Interactive 2013
 * Author: Gianluca Guarini
 *
 */
/*global Modernizr $*/
;(function(document, window, $document, $window, $body, $) {
    "use strict";

    $.support.transition = (function() {

        var transitionEnd = (function() {

            var el = document.createElement('GI'),
                transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd otransitionend',
                    'transition': 'transitionend'
                }, name;

            for (name in transEndEventNames) {
                if (el.style[name] !== undefined) {
                    return transEndEventNames[name];
                }
            }

        }());

        return transitionEnd && {
            end: transitionEnd
        };

    })();


    var OnePageScroll = function($el, customOptions) {
        /**
         *
         * Private protected variables
         *
         */
        var defaultOptions = {
            // Callbacks API
            onBeforeInit: null,
            onReady: null,
            onViewPortUpdate: null,
            onError: null,
            onBeforeAnimate: null,
            onAnimationComplete: null,
            onBeforeLoad: null,
            onContentLoaded: null,
            onDestroy: null,

            // settings
            startSectionId: 0,
            sections: [
                // {
                //  name:'section name',
                //  url:'path/to/the/section/html'
                // }
            ],
            animationOptions: {
                duration: 300,
                easing: 'linear'
            },
        },
            options = $.extend(defaultOptions, customOptions),
            csstransitions = $.support.transition,
            isLoading = false,
            isMoving = false,
            transformProp = Modernizr.prefixed('transform'),
            eventsNamespace = '.GIOnePageScroll',
            viewportSize = {
                width: 0,
                height: 0
            };

        /**
         *
         * Public variables
         *
         */
        this.VERSION = "0.0.1";
        this.sections = options.sections;
        this.freeze = false;
        // having always a reference to the current section selected
        this.currentSectionIndex = null;
        this.$currentSection = null;
        this.$el = $el;
        this.$loader = $('.GI_OPS_Loader', this.$el);
        /**
         *
         * Private Methods
         *
         */

        /*
         *
         * Debounce function from lodash
         * http://lodash.com/docs#debounce
         *
         */

        Function.prototype.debounce = function(wait, immediate) {
            var func = this,
                timeout, result;
            return function() {
                var context = this,
                    args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) result = func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) result = func.apply(context, args);
                return result;
            };
        };
        /**
         * Function triggered always before we load new contents
         */
        var onBeforeLoad = function() {
            showLoader.call(this);
            execCallback(options.onBeforeLoad);
        };

        var execCallback = function(callback, arg) {
            if (typeof callback === "function") {
                $.proxy(callback, self, arg)();
            }
        };
        var setTransitionTopProperty = function(value,fx) {
            var animationObj = {},
                    $this = $(this);
            if (Modernizr.csstransforms)
                $this.css(transformProp,'translateY(' + value + '%)');
            else
                $this.css('top', value + '%');

            return animationObj;
        };
        /**
         * Here we make the slides transition
         * @return { String } it could be 'up' or 'down' moving the elements into the viewport smoothly
         */
        var slideContents = function(animationDirection, $newContents, $oldContents) {

            $oldContents.addClass('GI_OPS_OldContents');

            isMoving = true;

            execCallback(options.onBeforeAnimate, $newContents);

            this.$el.append($newContents);

            //setTimeout($.proxy(function(){

            $.when(
                $oldContents
                //[csstransitions ? 'css' :'animate']({
                ['animate']({
                    topValue: (animationDirection === 'up' ? '100%' : '-100%')
                }, $.extend(options.animationOptions, {
                    step: setTransitionTopProperty,
                    start: (animationDirection === 'up' ? 100 : -100)
                })),
                $newContents
                .stop()
                //[csstransitions ? 'css' :'animate']({
                ['animate']({
                    topValue: "0%"
                }, $.extend(options.animationOptions, {
                    step: setTransitionTopProperty,
                    start:function(animation){
                        animation.tweens[0].start = (animationDirection === 'up' ? -100 : 100);
                    }
                }))
            ).done($.proxy(onAnimationComplete));

            //},this),5);

            setTimeout(function() {
                $newContents.removeClass(animationDirection);
            }, options.animationOptions.duration / 2);
            hideLoader.call(this);

        };
        var onAnimationComplete = function() {
            var $oldContents = $('.GI_OPS_OldContents', this.$el);

            setTimeout(function() {
                $oldContents.remove();

            }, options.animationOptions.duration - (options.animationOptions.duration / 4));

            execCallback(options.onAnimationComplete);
            isMoving = false;
        };
        /**
         * Callback triggered anytime a new content must be loaded into the viewport
         * @param  { Int } sectionIndex: index of the section object we have just loaded
         * @param  { String } data : the html loaded from the server
         */
        var onContentLoaded = function(sectionIndex, data) {
            var animationDirection = this.currentSectionIndex > sectionIndex ? 'up' : 'down';
            // set the current section
            this.currentSectionIndex = sectionIndex;

            var $newContents = $('<div class="GI_OPS_NewContents GI_OPS_ContentsWrapper ' + animationDirection + '"></div>');

            $newContents.html(data);

            if (this.$currentSection)
                $.proxy(slideContents, this, animationDirection, $newContents, this.$currentSection)();
            else {
                hideLoader.call(this);
                this.$el.append($newContents);
                $newContents.removeClass(animationDirection);
            }

            // cache the current contents
            this.$currentSection = $('.GI_OPS_NewContents', this.$el);
            this.$currentSection.removeClass('GI_OPS_NewContents').addClass('GI_OPS_CurrentContents');

            isLoading = false;

            execCallback(options.onContentLoaded, $newContents);

        };
        /**
         * Simple loader toggles
         */
        var hideLoader = function() {
            this.$loader.addClass('GI_OPS_Hidden');
        };
        var showLoader = function() {
            this.$loader.removeClass('GI_OPS_Hidden');
        };

        /**
         *
         * Public Methods
         *
         */

        /**
         * Bring it on!
         */
        this.init = function() {
            execCallback(options.onBeforeInit);

            this.setViewport();
            this.bindEvents();

            if (options.startSectionId)
                this.loadSection(options.startSectionId);

            execCallback(options.onReady);
        };

        /**
         * Load any page contained in the sections array
         * @param  { Int } sectionIndex: index of the section to load
         * @return { Object } jquery deferred object
         */
        this.loadSection = function(sectionIndex) {

            var sectionToLoad = this.sections[sectionIndex];
            if (!sectionToLoad ||
                sectionIndex === this.currentSectionIndex ||
                sectionIndex < 0 ||
                isLoading ||
                isMoving ||
                this.freeze
            ) return new $.Deferred().reject().promise();



            var ajax = $.ajax({
                url: sectionToLoad.url,
                onError: options.onError,
                beforeSend: $.proxy(onBeforeLoad, this)
            });

            isLoading = true;

            // on content loaded listener
            ajax.always($.proxy(onContentLoaded, this, sectionIndex));

            return ajax;
        };
        /**
         *
         * Scroll to the next section
         *
         */
        this.nextSection = function() {
            this.loadSection(this.currentSectionIndex + 1);
        };
        /**
         *
         * Scroll to the previous section
         *
         */
        this.prevSection = function() {
            this.loadSection(this.currentSectionIndex - 1);
        };

        /**
         * Bind all the plugin events
         * @return {[type]} [description]
         */
        this.bindEvents = function() {

            if (csstransitions)
                this.$el.on(csstransitions.end + eventsNamespace, '.GI_OPS_OldContents', $.proxy(onAnimationComplete, this));

            // Bind the window events
            $window.on('resize' + eventsNamespace + ' orientationchange' + eventsNamespace, $.proxy(this.setViewport, this).debounce(50, true));
            $window.on('mousewheel' + eventsNamespace, $.proxy(function(e, delta) {
                this[delta > 0 ? 'prevSection' : 'nextSection']();
            }, this).debounce(50, true));
            $window.on('keydown' + eventsNamespace, $.proxy(function(e) {
                if (e.keyCode === 38)
                    this.prevSection();
                if (e.keyCode === 40)
                    this.nextSection();
            }, this));
        };
        /**
         * Unbind all the plugin events
         */
        this.unbindEvents = function() {
            this.$el.off(eventsNamespace);
            $window.off(eventsNamespace);
        };

        this.destroy = function() {
            this.unbindEvents();
            execCallback(options.onDestroy);
        };
        /**
         *
         * Update the viewport making it always fullscreen
         *
         */
        this.setViewport = function() {
            this.viewportSize = {
                width: $window.width(),
                height: $window.height()
            };

            execCallback(options.onViewPortUpdate);
        };

        return this.init();
    };

    /*
     *
     * Exporting the class extending jQuery
     *
     */

    $.fn.OnePageScroll = function(customOptions) {
        if (!this.length) return;
        return new OnePageScroll(this, customOptions);
    };

}(document, window, $(document), $(window), $('body'), jQuery));