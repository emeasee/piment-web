/* jshint undef: false, unused: false, newcap: false, latedef: nofunc */

;( function( window ) {

	'use strict';

	var docElem = window.document.documentElement,
		transEndEventNames = {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd',
			'msTransition': 'MSTransitionEnd',
			'transition': 'transitionend'
		},
		transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
		support = { transitions : Modernizr.csstransitions };

	/**
	 * gets the viewport width and height
	 * based on http://responsejs.com/labs/dimensions/
	 */
	function getViewport( axis ) {
		var client, inner;
		if( axis === 'x' ) {
			client = docElem['clientWidth'];
			inner = window['innerWidth'];
		}
		else if( axis === 'y' ) {
			client = docElem['clientHeight'];
			inner = window['innerHeight'];
		}

		return client < inner ? inner : client;
	}

	/**
	 * extend obj function
	 */
	function extend( a, b ) {
		for( var key in b ) {
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * DragSlideshow function
	 */
	function DragSlideshow( el, options ) {
		this.el = el;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
	}

	/**
	 * DragSlideshow options
	 */
	DragSlideshow.prototype.options = {
		perspective : '1200',
		slideshowRatio : 0.3, // between: 0,1
		onToggle : function() { return false; },
		onToggleContent : function() { return false; },
		onToggleContentComplete : function() { return false; }
	}

	/**
	 * init function
	 * initialize and cache some vars
	 */
	DragSlideshow.prototype._init = function() {
		var self = this;

		// current
		this.current = 0;

		// status
		this.isFullscreen = true;

		// the images wrapper element
		this.imgDragger = this.el.querySelector( 'section.dragdealer' );

		// the moving element inside the images wrapper
		this.handle = this.imgDragger.querySelector( 'div.handle' );

		// the slides
		this.slides = [].slice.call( this.handle.children );

		// total number of slides
		this.slidesCount = this.slides.length;

		if( this.slidesCount < 1 ) return;

		// cache options slideshowRatio (needed for window resize)
		this.slideshowRatio = this.options.slideshowRatio;

		// add class "current" to first slide
		classie.add( this.slides[ this.current ], 'current' );

		// the pages/content
		this.pages = this.el.querySelector( 'section.pages' );

		// set the width of the handle : total slides * 100%
		this.handle.style.width = this.slidesCount * 100 + '%';

		// set the width of each slide to 100%/total slides
		this.slides.forEach( function( slide ) {
			slide.style.width = 100 / self.slidesCount + '%';
		} );

		// initialize the DragDealer plugin
		this._initDragDealer();

		// set perspective value to the main element
		this.el.style.WebkitPerspective = this.options.perspective + 'px';
		this.el.style.perspective = this.options.perspective + 'px';

		// init events
		this._initEvents();
	}

	/**
	 * initialize the events
	 */
	DragSlideshow.prototype._initEvents = function() {
		var self = this;

		this.slides.forEach( function( slide ) {
			// clicking the slides when not in isFullscreen mode
			slide.addEventListener( 'click', function() {
				if( self.isFullscreen || self.dd.activity || self.isAnimating ) return false;

				if( self.slides.indexOf( slide ) === self.current ) {
					self.toggle();
				}
				else {
					self.dd.setStep( self.slides.indexOf( slide ) + 1 );
				}
			} );

			// reveal content
			slide.querySelector( 'button.content-switch' ).addEventListener( 'click', function() { self._toggleContent( slide ); } );
		} );

		// keyboard navigation events
		document.addEventListener( 'keydown', function( ev ) {
			var keyCode = ev.keyCode || ev.which,
				currentSlide = self.slides[ self.current ];

			if( self.isContent ) {
				switch (keyCode) {
					// up key
					case 38:
						// only if current scroll is 0:
						if( self._getContentPage( currentSlide ).scrollTop === 0 ) {
							self._toggleContent( currentSlide );
						}
						break;
				}
			}
			else {
				switch (keyCode) {
					// down key
					case 40:
						// if not fullscreen don't reveal the content. If you want to navigate directly to the content then remove this check.
						if( !self.isFullscreen ) return;
						self._toggleContent( currentSlide );
						break;
					// right and left keys
					case 37:
						self.dd.setStep( self.current );
						break;
					case 39:
						self.dd.setStep( self.current + 2 );
						break;
				}
			}
		} );
	}

	/**
	 * gets the content page of the current slide
	 */
	DragSlideshow.prototype._getContentPage = function( slide ) {
		return this.pages.querySelector( 'div.content[data-content = "' + slide.getAttribute( 'data-content' ) + '"]' );
	}

	/**
	 * show/hide content
	 */
	DragSlideshow.prototype._toggleContent = function( slide ) {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;

		// callback
		this.options.onToggleContent();

		// get page
		var page = this._getContentPage( slide );

		if( this.isContent ) {
			// enable the dragdealer
			this.dd.enable();
			classie.remove( this.el, 'show-content' );
		}
		else {
			// before: scroll all the content up
			page.scrollTop = 0;
			// disable the dragdealer
			this.dd.disable();
			classie.add( this.el, 'show-content' );
			classie.add( page, 'show' );
		}

		var self = this,
			onEndTransitionFn = function( ev ) {
				if( support.transitions ) {
					if( ev.propertyName.indexOf( 'transform' ) === -1 || ev.target !== this ) return;
					this.removeEventListener( transEndEventName, onEndTransitionFn );
				}
				if( self.isContent ) {
					classie.remove( page, 'show' );
				}
				self.isContent = !self.isContent;
				self.isAnimating = false;
				// callback
				self.options.onToggleContentComplete();
			};

		if( support.transitions ) {
			this.el.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}

	/**
	 * initialize the Dragdealer plugin
	 */
	DragSlideshow.prototype._initDragDealer = function() {
		var self = this;
		this.dd = new Dragdealer( this.imgDragger, {
			steps: this.slidesCount,
			speed: 0.4,
			loose: true,
			requestAnimationFrame : true,
			callback: function( x, y ) {
				self._navigate( x, y );
			}
		});
	}

	/**
	 * DragDealer plugin callback: update current value
	 */
	DragSlideshow.prototype._navigate = function( x, y ) {
		// add class "current" to the current slide / remove that same class from the old current slide
		classie.remove( this.slides[ this.current || 0 ], 'current' );
		this.current = this.dd.getStep()[0] - 1;
		classie.add( this.slides[ this.current ], 'current' );
	}

	/**
	 * toggle between fullscreen and minimized slideshow
	 */
	DragSlideshow.prototype.toggle = function() {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;

		// add preserve-3d to the slides (seems to fix a rendering problem in firefox)
		this._preserve3dSlides( true );

		// callback
		this.options.onToggle();

		classie.remove( this.el, this.isFullscreen ? 'switch-max' : 'switch-min' );
		classie.add( this.el, this.isFullscreen ? 'switch-min' : 'switch-max' );

		var self = this,
			p = this.options.perspective,
			r = this.options.slideshowRatio,
			zAxisVal = this.isFullscreen ? p - ( p / r ) : p - p * r;

		this.imgDragger.style.WebkitTransform = 'translate3d( -50%, -50%, ' + zAxisVal + 'px )';
		this.imgDragger.style.transform = 'translate3d( -50%, -50%, ' + zAxisVal + 'px )';

		var onEndTransitionFn = function( ev ) {
			if( support.transitions ) {
				if( ev.propertyName.indexOf( 'transform' ) === -1 ) return;
				this.removeEventListener( transEndEventName, onEndTransitionFn );
			}

			if( !self.isFullscreen ) {
				// remove preserve-3d to the slides (seems to fix a rendering problem in firefox)
				self._preserve3dSlides();
			}

			// replace class "img-dragger-large" with "img-dragger-small"
			classie.remove( this, self.isFullscreen ? 'img-dragger-large' : 'img-dragger-small' );
			classie.add( this, self.isFullscreen ? 'img-dragger-small' : 'img-dragger-large' );

			// reset transforms and set width & height
			self.imgDragger.style.WebkitTransform = 'translate3d( -50%, -50%, 0px )';
			self.imgDragger.style.transform = 'translate3d( -50%, -50%, 0px )';
			this.style.width = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			this.style.height = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			// reinstatiate the dragger with the "reflow" method
			self.dd.reflow();

			// change status
			self.isFullscreen = !self.isFullscreen;

			self.isAnimating = false;
		};

		if( support.transitions ) {
			this.imgDragger.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}

	/**
	 * add/remove preserve-3d to the slides (seems to fix a rendering problem in firefox)
	 */
	DragSlideshow.prototype._preserve3dSlides = function( add ) {
		this.slides.forEach( function( slide ) {
			slide.style.transformStyle = add ? 'preserve-3d' : '';
		});
	}

	/**
	 * add to global namespace
	 */
	window.DragSlideshow = DragSlideshow;

} )( window );



/* version 1

$(document).ready(function(){

    $.ajaxSetup({
           async: false
       });
    $body = $(document.body);
    $window = $(window);
    $html = $(document.documentElement);
    $cover = $(document).find('#canvas');
    $posts = $('section.work article');
    $browser_height = $(window).height();
    $scrolled = false;

    var coverShowing = true;
    var $scrollLimit = 600;
    var $scrolledPast = false;
    var buttonChanged = false;
    var sliders = [];
    var prevVideo;
    var imgLoad = imagesLoaded( $body );

    function initCover(){
        if(!coverShowing){
            Background();
            coverShowing = true;
        } else {
            return;
        }
    }

    function scrollEvent(){
        var $top = $($window).scrollTop();
        var $num = 1 - (($top - ($browser_height * 0.15)) / ($browser_height * 0.8));
        var t = $('#scroll','nav.bottom');
        $scrolledPast = ($top > $scrollLimit ? true : false);

        $('#slide .scroll #canvas').css({'opacity': $num, 'transform': 'scale(' + $num + ')'});

        if ( $top < $scrollLimit && t.hasClass('one') || $top > $scrollLimit && $top < 3000 && t.hasClass('two') || $top > 3000 && t.hasClass('three') ) return;

        $($window).unbind('scroll');
        t.stop(true,true);

        if ( $top < $scrollLimit ){
           changeBottomButton(t, 'Scroll down', 'middle', 'one');
       } else {
           if ($top > 3000){
               changeBottomButton(t, 'Top', 'slide', 'three');
           } else {
               changeBottomButton(t, 'Swipe to navigate projects >>>', 'slide', 'two');
           }
       }
    }

    function changeBottomButton(el, text, scrollPoint, c){
        el.removeAttr('class')
          .addClass('hide')
          .unbind('click')
          .on('click', function(){scrollToPlace(scrollPoint);})
          .delay(500)
          .queue(function(){
              $(this).addClass(c).text(text).removeClass('hide').dequeue();
              $($window).scroll(scrollEvent).dequeue();
              if ($scrolledPast === true){
                  if(coverShowing){
                      $cover.removeClass('on').find('canvas').remove();
                      Background.prototype.removeScene();
                      coverShowing = false;
                  }
              } else {
                  if($cover.length && $html.hasClass('desktop')){
                      initCover();
                  }
              }
          });
    }

    function onAlways( instance ) {
        changeBottomButton($('#scroll','nav.bottom'), 'Scroll down', 'middle', 'one');
    }

    function getData(post){
        $.getJSON('/json/post_'+ post +'.json', function(d){
            con = d;
        });
        return con;
    }

    function linkToBlogOverlay(num){
        var a = num;
        var result = numPosts + a;
        return result;
    }

    function showLatestBlogTitles () {
        var i = 0, j = 0, el = $('section.posts .last'),con;
        //Change i for desired num of posts
        for (i; i < 3; i++){
            j++;var p = numPosts - j;var post,title,date,excerpt;
            post = $('<article>').attr('id',p);
            title = $('<a>').text(getData(p).title);
            date = $('<span>').attr('class','date').text(getData(p).date);
            excerpt = getData(p).excerpt;
            post.append(date,title,excerpt).appendTo(el);
        }
    }

    function scrollToPlace($el, $slide, $pos){
        $($window).unbind('scroll');
        if ($slide){
            $slide.royalSlider('goTo', $pos);
        }
        $('html, body').animate({
            scrollTop: $('#' + $el).offset().top
        }, 400, function(){ $($window).scroll(scrollEvent);scrollEvent(); });
    }

    function lockScrollDesktop(){
        //if ($html.hasClass('desktop')){
        $body.css({ overflow: 'hidden' }).find('.dark').fadeIn('fast');
        //}
    }

    if (!Array.prototype.last){
        Array.prototype.last = function(){
            return this[this.length - 1];
        };
    }

    function initMobile(){
        $body.find('#slide .scroll p').css({
            background: '#ea0000',
            height: '250px',
            width: '250px',
            borderRadius: '50%'
        });
    }


    imgLoad.on( 'always', onAlways );

    if(window.location.hash){
        lockScrollDesktop();
        ArticleAnimator.load();
        $body.find('.blog').addClass('open');
    } else {
        if($cover.length && $html.hasClass('desktop')){
            coverShowing = false;
            initCover();
        } else {
            initMobile();
        }
    }

    jQuery.rsCSS3Easing.easeOutBack = 'cubic-bezier(0, 0.44999, 0, 1.03)';

    $('.royalSlider').each(function(i){
        sliders[i] = $(this).royalSlider({
            addActiveClass: true,
            arrowsNav: true,
            arrowsNavAutoHide:false,
            navigateByClick: false,
            sliderDrag: false,
            easeInOut: 'easeOutBack',
            easeOut: 'easeOutBack',
            controlNavigation: 'none',
            autoScaleSlider: true,
            autoScaleSliderWidth: 960,
            autoScaleSliderHeight: 640,
            loop: true,
            fadeinLoadedSlide: false,
            globalCaption: false,
            keyboardNavEnabled: false,
            globalCaptionInside: false,

            visibleNearby: {
              enabled: true,
              centerArea: 0.5,
              center: true,
              breakpoint: 650,
              breakpointCenterArea: 0.85,
              navigateByCenterClick: true
            }
        });
      });

    $.each(sliders, function(){
        $(this).data('royalSlider').ev.on('rsAfterSlideChange', function(){
            var thisvideo = this.currSlide.content.find('video');
            if(prevVideo){
                prevVideo.pause();
            }
            if(thisvideo.length) {
                prevVideo = thisvideo[0];
                prevVideo.play();
                thisvideo.on('click', function(){
                    $(this)[0].load();
                    $(this)[0].play();
                });
            } else {
                prevVideo = null;
            }
        });
    });

    $($posts).each(function(){
        var t = $(this).find('ul li.update a.button');
        if (t.length !== 0){
            var id = parseInt(t.attr('href'));
            id = numPosts - id;
            t.attr('href','#' + id);
        }
    });

    //showLatestBlogTitles();

    /*$('#index').on('click', function(event) {
        event.preventDefault();
        $('.index').addClass('open');
    });

    $('#work').on('click', function(){
        scrollToPlace('middle');
    });

    $('#about').on('click', function(event) {
        event.preventDefault();
        scrollToPlace('about-slide', sliders.last(), 0);
    });

    $('#contact').on('click', function(event) {
        event.preventDefault();
        scrollToPlace('about-slide',sliders.last(), 2);
    });

    $('section.work article ul li.update p a.post').on('click', function(event){
        event.preventDefault();
        var $target = $(this);
        var $id = $target.attr('href');
        history.pushState( '', '', $id);
        lockScrollDesktop();
        ArticleAnimator.load();
        if(coverShowing){
            $cover.removeClass('on').find('canvas').remove();
            Background.prototype.removeScene();
            coverShowing = false;
        }
    });

    $($window).scroll(scrollEvent);

    $('#blog').on('click', function(event) {
        event.preventDefault();
        lockScrollDesktop();
        ArticleAnimator.load();
        if(coverShowing){
            $cover.removeClass('on').find('canvas').remove();
            Background.prototype.removeScene();
            coverShowing = false;
        }
    });

    $('.dark, h3.logo').on('click', function(event) {
        event.preventDefault();
        coverShowing = false;
        $body.css({
            overflow: 'auto'
        });
        $('div.blog').removeClass('open').find('h3.logo').removeClass('down');
        $('div.dark').fadeOut('fast');
        $('.page.current, .page.next').remove();
        history.pushState( '', '', ' ');
        if($cover.length && $html.hasClass('desktop')){
            initCover();
            console.log('?');
        }
    });
});
*/
