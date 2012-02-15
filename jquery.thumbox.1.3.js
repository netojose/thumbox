/** 
  * 
  * Thumbox - plugin para galeria de imagens
  *
  *  @author     Jose Raimundo de Sousa Neto <sputinykster@gmail.com>
  *  @version    1.3
  *  @link       http://www.jneto.net.br
  *  @since      1.0
  *  
  **/
(function($,doc){
    $.fn.thumbox = function(settings) {
        var defaults = {
            thumbs:5,
            overlayColor:'#999',
            overlayOpacity:0.8,
            overlaySpeed:500,
            scrollSpeed:500,
            zoomSpeed:250,
            showOne:false,
			preventImgOverflow:true,
            keyboardNavigation:true,
            wheelNavigation:true,
            showLabel:true,
            labelPosition:'bottom',
			descAttr:'alt',
            dockPosition:'top',
            timeOut:15,
            maxThumbWidth:0,
            maxThumbHeight:0,
            openImageEffect:'linear',
            closeImageEffect:'linear',
            scrollDockEffect:'linear'
        };
        settings             = $.extend(defaults, settings);
		var _sputinyk        = [];
        var _locked          = undefined;
        var _width           = undefined;
        var _page            = undefined;
        var _qtdImgs         = undefined;
        var _currentImage    = undefined;
        var _coordToCloseImg = false;
        var _isSingleImg     = false;
        var _wasAborted      = false;
        var _clockTimeOut    = 0;
        $all                 = $(this);
		
		storeData = function(el, data){for ( key in data ) el.data(key, data[key]); return }
		
        $all.each(function(k,matched){
            objList = (matched.tagName == 'A') ? $(matched) : $(matched).find('a');
            if(objList.size() == 1){
				storeData(objList, settings);
                $(objList).bind('click', function(e){
                    $(this).blur();
                    e.preventDefault();
                    _wasAborted = false;
                    img   = $(this).find('img');
                    label = $(img).attr(settings.descAttr);
                    big   = $(this).attr('href');
                    coord = {
                        left:   $(img).offset().left, 
                        top:    $(img).offset().top, 
                        width:  $(img).outerWidth(), 
                        height: $(img).outerHeight()
                    }
                    openImageFromPage(big, label, coord, settings);
                })
            } else {
                objList.each(function(i,e){
                    $(e).bind('click', function(e){
						e.preventDefault();
                        $(this).blur();
                        _wasAborted = false;
                        showDock($(this).data('objlist'), $(this).data('params'), $(this).data('indeximg'))
                        });
						storeData($(e), {
	                        'indeximg':i+1, 
	                        'params':settings, 
	                        'objlist':$(matched)
                        });
						$(e).find('img').data('big', $(e).attr('href'));
                    if(settings.showOne && (i>0)){
                        $(e).css({
                            'position':'absolute', 
                            'left':-5000, 
                            'top':-3000
                        });
                    }
                });
            }
        });
		
		getDim = function(wImg, hImg, dW, dH){
			if(wImg > dW){
                hImg = hImg / (wImg / dW);
                wImg = dW;
            }
            if(hImg > dH){
                wImg = wImg / (hImg / dH);
                hImg = dH;
            }
			return [wImg, hImg]
		}
		
        showDock = function(objs, params, autoopen){
            setPlParams(params);
            _wasAborted = false;
            showLoader();
            maxThumbW = (getPlParam('maxThumbWidth') === 0) ? 1000000 : getPlParam('maxThumbWidth');
            maxThumbH = (getPlParam('maxThumbHeight') === 0) ? 1000000 : getPlParam('maxThumbHeight');
            cls       = false;
            pgs       = '<div class="thumbox-page" page="1">';
            qtd       = $(objs).find('a').find('img').size();
            pag       = 1;
            $(objs).find('a').find('img').each(function(i,e){
                src         = $(e).attr('src');
                big         = $(e).data('big');
                lbl         = $(e).attr('alt');
                widthThumb  = $(e).width();
                heightThumb = $(e).height();
				newSizes    = getDim(widthThumb, heightThumb, maxThumbW, maxThumbH);
				widthThumb  = newSizes[0];
				heightThumb = newSizes[1];
                pgs += '<img src="'+src+'" alt="'+lbl+'" big="'+big+'" imgindex="'+(i+1)+'" width="'+widthThumb+'" height="'+heightThumb+'" />';
                if(!((i+1)%getPlParam('thumbs'))){
                    pgs += '</div>';
                    cls = true;
                    if((i+1)<qtd){
                        pag = pag + 1;
                        pgs += '<div class="thumbox-page" page="'+pag+'">';
                        cls = false;
                    }
                }
            });
            if(!cls){
                pgs += '</div>'
                }
            $('body').append('<div id="thumbox-dock"><div class="thumbox-arrowdock thumbox-leftarrow" arrowdir="p"></div><div class="thumbox-scrollerpages"><div class="thumbox-pages">'+pgs+'</div></div><div class="thumbox-arrowdock thumbox-rightarrow" arrowdir="n"></div></div>');
            $('.thumbox-page > img').bind('click', function(e){
                if(isLocked()) return;
                openImageFromDock($(e.target).attr('imgindex'));
            }).bind('mouseover', function(e){
                $(e.target).addClass('thumbox-hoverImage');
            }).bind('mouseout', function(e){
                $(e.target).removeClass('thumbox-hoverImage');
            });
            $('.thumbox-arrowdock').bind('click', function(e){
                if(isLocked()) return;
                page = _page;
                goToPage(($(e.target).attr('arrowdir') == 'n') ? page+1 : page-1);
            });
            
            if(getPlParam('wheelNavigation')){
                attatchWheelEvent();
            }
            
            if(getPlParam('keyboardNavigation')){
                $(document).bind('keydown', keyboardNav);
            }
            $('#thumbox-dock > .thumbox-leftarrow').fadeTo(0, 0.1);
            if($('.thumbox-page').size() == 1) {
                $('#thumbox-dock > .thumbox-rightarrow').fadeTo(0, 0.1);
            }
            wmax = hmax = 0;
            $('.thumbox-page').each(function(i,e){
                if($(e).width() > wmax) wmax = $(e).width();
                if($(e).height() > hmax) hmax = $(e).height();
            });
            $('.thumbox-page, .thumbox-scrollerpages, #thumbox-dock').css({
                'width':wmax, 
                'height':hmax
            });
            $('.thumbox-pages').css({
                'width':wmax*$('.thumbox-page').size()
                });
            $('.thumbox-arrowdock').css({
                'height':hmax
            });
            showOverlay();
            _locked          = true;
            _width           = wmax;
            _page            = 1;
            _qtdImgs         = qtd;
            _currentImage    = false;
            _coordToCloseImg = false;
            _isSingleImg     = false;
            tTop = (getPlParam('dockPosition') == 'top') ? ($(document).scrollTop()+10) : ($(window).height()+$(document).scrollTop()-$('#thumbox-dock').height()-10);
            $('#thumbox-dock').css({
                'top':tTop,
                'width':wmax+40,
                left:($(window).width()/2)-(wmax/2)-20
            }).hide().fadeIn(getPlParam('overlaySpeed'), function(){
                unlockHandlers();
                if(autoopen != undefined) {
                    goToPage(Math.ceil(autoopen/getPlParam('thumbs')), autoopen)
                }
            })
        };
        
        var attatchWheelEvent = function(){
            if(document.attachEvent) {
                document.attachEvent("onmousewheel", thumboxWheel);
            } else {
                if(window.addEventListener) window.addEventListener($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel', thumboxWheel, false);
            }
        }
        
        var deattatchWheelEvent = function(){
            if(document.detachEvent) {
                document.detachEvent("onmousewheel", thumboxWheel);
            } else {
                if(window.removeEventListener) window.removeEventListener($.browser.mozilla ? 'DOMMouseScroll' : 'onmousewheel', thumboxWheel, false);
            }
        }
        
        var thumboxWheel = function(event){
			if (($.browser.msie && (Number($.browser.version) < 8)) || $.browser.opera) {
				return;
			}
            var delta = 0;
            if (!event) 
                event = window.event;
            if (event.wheelDelta) {
                delta = event.wheelDelta / 120;
                if (window.opera) delta = -delta;
            }
            else 
                if (event.detail) delta = -event.detail / 3;
            if (delta) {
                if (delta > 0) {
                    if(isLocked()) return;
                    openPrev();
                } else {
                    if(isLocked()) return;
                    openNext();
                };
            }
        }
	
        var lockHandlers   = function(){
            _locked = true
            }
        var unlockHandlers = function(){
            _locked = false
            }
        var isLocked       = function(){
            return _locked
            }
        var isSingleImg    = function(){
            return _isSingleImg
            }
	
        var keyboardNav = function(evt){
            if(evt.keyCode == 27){
                _wasAborted = true;
                closeDock();
                return;
            }
            if((!getPlParam('keyboardNavigation')) || (jQuery.inArray(evt.keyCode, [39,40,13,32,37,38,8,27,36,35]) == -1)) return;
            evt.preventDefault();
            if(isLocked()) return;
            switch (evt.keyCode) {
                case 39:
                case 40:
                case 13:
                case 32:
                    if(!isSingleImg()) openNext()
                    break;
                case 37:
                case 38:
                case 8:
                    if(!isSingleImg()) openPrev()
                    break;
                case 36:
                    if(!isSingleImg()) openImageFromDock(1)
                    break;
                case 35:
                    if(!isSingleImg()) openImageFromDock(_qtdImgs)
                    break;
                case 27:
                    closeDock();
                    break;
            }
        }
	
        var unbindKeyboardEvt = function(){
            $(document).unbind('keydown', keyboardNav);
            deattatchWheelEvent();
        }
	
        var showLoader = function(){
            if ($('#thumbox-loader').size()) return;
            $('body').append('<div id="thumbox-loader"></div>');
            $('#thumbox-loader').css({
                left:$(window).width()/2-64,
                top:$(window).height()/2+$(document).scrollTop()-7
            })
        }
	
        var hideLoader = function(){
            $('#thumbox-loader').remove()
        }
	
        var openNext = function(){
            openImageFromDock(_currentImage+1)
        }
	
        var openPrev = function(){
            openImageFromDock(_currentImage-1)
        }
        
        var setPlParams = function(listValues){
            _sputinyk = listValues;
            if($.easing.def == undefined) {
                _sputinyk.openImageEffect  = 'linear';
                _sputinyk.closeImageEffect = 'linear';
                _sputinyk.scrollDockEffect = 'linear';
            }
        }
		
		var getPlParam = function(param){return _sputinyk[param]}
	
        var openImageFromPage = function(big, label, coord, params){
            setPlParams(params);
            _isSingleImg = true;
            showLoader();
            showOverlay();
            showImage(coord, big, label, undefined);
            if(getPlParam('wheelNavigation')){
                attatchWheelEvent();
            }
            if(getPlParam('keyboardNavigation')){
                $(window).bind('keydown', keyboardNav);
            }
        }
	
        var openImageFromDock = function(imgindex){
            if(imgindex < 1) return;
            if(imgindex > _qtdImgs) return;
            if(_currentImage == imgindex) return;
            lockHandlers();
            page = Math.ceil(imgindex/getPlParam('thumbs'));
            if(_page != page){
                goToPage(page, imgindex);
                return;
            }
            $('.thumbox-page > img').removeClass('thumbox-currentImage');
            $('.thumbox-page').find('img[imgindex="'+imgindex+'"]').addClass('thumbox-currentImage');
            _currentImage = imgindex
            thumb  = $('.thumbox-page > img[imgindex="'+imgindex+'"]');
            urlImg = $(thumb).attr('big');
            label  = $(thumb).attr(getPlParam('descAttr'));
            showLoader();
            if ($('#thumbox-image').size()) {
                closeImage(imgindex);
                return;
            }
            cord   = {
                left:   $(thumb).offset().left+5, 
                top:    $(thumb).offset().top+5, 
                width:  $(thumb).outerWidth()-10, 
                height: $(thumb).outerHeight()-10
            }
            showImage(cord, urlImg, label, imgindex);
        }
	
        var showImage = function(cord, urlImg, label, imgindex){
            _coordToCloseImg = cord;
            var img          = document.createElement('img');
            $('body').append(img);
            _clockTimeOut = 0;
            var timeOutThumbox = setInterval(function(){
                if(_clockTimeOut > getPlParam('timeOut')){
                    clearInterval(timeOutThumbox);
                    _wasAborted = true;
                    closeDock();
                    closeOverlay();
                }
            }, 1000);
            $(img).hide().attr('src', urlImg);
            var objImagePreloader     = new Image();
            objImagePreloader.onerror = null;
            objImagePreloader.onload  = function(){
                clearInterval(timeOutThumbox);
                hideLoader();
                if(_wasAborted){
                    $(img).remove();
                    return;
                }
                img.id  = 'thumbox-image';
                img.src = urlImg;
				if(getPlParam('preventImgOverflow')){
					diff = 37;
					if(getPlParam('showLabel')) diff += 40;
					newDim    = getDim(objImagePreloader.width, objImagePreloader.height, $(window).width(), ($(window).height()-diff));
					imgWidth  = newDim[0];
                    imgHeight = newDim[1];
				} else {
					imgWidth  = objImagePreloader.width;
                	imgHeight = objImagePreloader.height;
				}
                $(img).css(cord).show().animate({
                    left:($(window).width()/2)-(imgWidth/2),
                    top:($(window).height()/2)-(imgHeight/2)+$(document).scrollTop(),
                    width:imgWidth,
                    height:imgHeight
                }, {"easing": getPlParam('openImageEffect'), duration:getPlParam('zoomSpeed'), complete:function(){
                    if(_wasAborted) return;
                    $('body').append('<div id="thumbox-border"></div>');
                    pos = jQuery(img).position();
                    $('#thumbox-border').hide().css({
                        width:imgWidth+12,
                        height:imgHeight+12,
                        left:pos.left-6,
                        top:pos.top-6
                    }).fadeIn('normal', function(){
                        unlockHandlers();
                        $('body').append('<div id="thumbox-close"></div>');
                        $('#thumbox-close').bind('click', function(){
                            if(isLocked()) return;
                            closeDock();
                        }).css({
                            left:pos.left-12+imgWidth,
                            top:pos.top-6-12
                        });
                    });
                    //botoes de navegacao
                    if((imgindex != 1) && (imgindex != undefined)){
                        $('body').append('<div id="thumbox-buttonPrev"></div>');
                        $('#thumbox-buttonPrev').bind('click', function(){
                            if(isLocked()) return;
                            openPrev()
                        })
                    }
                    if((imgindex != _qtdImgs) && (imgindex != undefined)){
                        $('body').append('<div id="thumbox-buttonNext"></div>');
                        $('#thumbox-buttonNext').bind('click', function(){
                            if(isLocked()) return;
                            openNext()
                        })
                    }
                    topBtn = pos.top+imgHeight/2-33;
                    $('#thumbox-buttonPrev').css({
                        top:topBtn, 
                        left:pos.left-51
                        });
                    $('#thumbox-buttonNext').css({
                        top:topBtn, 
                        left:pos.left+imgWidth+10
                        });
                    if(!$.browser.msie){
                        $('#thumbox-buttonPrev, #thumbox-buttonNext').hide().fadeIn();
                    }
				
                    //label na imagem
                    if(getPlParam('showLabel') && (label != '') && (label != undefined)){
                        $('body').append('<div id="thumbox-label"></div>');
                        $('#thumbox-label').html(label);
                        topPosLabel = (getPlParam('labelPosition') == 'bottom') ? pos.top+imgHeight+10 : pos.top-25-$('#thumbox-label').height();
                        $('#thumbox-label').css({
                            top:topPosLabel,
                            left:pos.left+(imgWidth/2)-($('#thumbox-label').width()/2)
                        });
                        if(!$.browser.msie){
                            $('#thumbox-label').hide().fadeIn();
                        }
                    }
                }});
                objImagePreloader.onload = function(){}; // Thanks for IE :(
            };
            objImagePreloader.src = urlImg;
        }
	
        var showOverlay = function(){
            $('body').append('<div id="thumbox-overlay"></div>').css({'overflow':'hidden'});
            $('#thumbox-overlay').bind('click', function(){
                _wasAborted = true;
                closeDock()
            }).css({
                'width':$(window).width(), 
                'height':$(document).height(), 
				'background':getPlParam('overlayColor')
            }).fadeTo(getPlParam('overlaySpeed'), getPlParam('overlayOpacity'));
        }
	
        var closeOverlay = function(){
            $('#thumbox-overlay').fadeOut(getPlParam('overlaySpeed'), function(){
                $('#thumbox-overlay').remove().unbind();
                hideLoader();
                $('body').css({'overflow':'auto'});
            });
        }
	
        var goToPage = function(goTo, autoopen){
            page = _page;
            move = true;
            if(goTo == page) move = false;
            dir = (goTo > page) ? 'n' : 'p';
            siz = Math.abs(goTo - page) * _width;
            if((dir == 'p') && (page == 1)) move = false;
            if((dir == 'n') && (page >= $('.thumbox-page').size())) move = false;
            if(!move){
                if(autoopen != undefined) {
                    openImageFromDock(autoopen);
                } else {
                    unlockHandlers();
                }
                return;
            } else {
                walk  = ((dir=='n') ? '-' : '+')+'='+siz;
                _page = goTo;
                _coordToCloseImg = false;
			
                if(goTo == 1){
                    $('#thumbox-dock > .thumbox-leftarrow').fadeTo('normal', 0.1)
                } else {
                    $('#thumbox-dock > .thumbox-leftarrow').fadeTo('normal', 1.0)
                }
                if(goTo == $('.thumbox-page').size()){
                    $('#thumbox-dock > .thumbox-rightarrow').fadeTo('normal', 0.1)
                } else {
                    $('#thumbox-dock > .thumbox-rightarrow').fadeTo('normal', 1.0)
                }
                $('.thumbox-pages').animate({
                    left:walk
                }, {easing:getPlParam('scrollDockEffect'), duration:getPlParam('scrollSpeed'), complete:function(){
                    if(autoopen != undefined){
                        openImageFromDock(autoopen)
                    } else {
                        unlockHandlers()
                    }
                }})
            }
        }
        
        var hideControls = function(){
            $('#thumbox-border').remove();
            els = '#thumbox-close, #thumbox-buttonNext, #thumbox-buttonPrev, #thumbox-label';
            if(!$.browser.msie){
                $(els).unbind().fadeOut('fast', function(){
                    $(els).remove();
                });
            } else {
                $(els).unbind().remove();
            }
        }
	
        var closeImage = function(open, toCloseDock){ 
            if($('#thumbox-image').size()){
                hideControls();
                if(_coordToCloseImg != false) {
                    coord = _coordToCloseImg
                } else {
                    coord = {
                        left:($(window).width()/2),
                        top:($(window).height()/2)+$(document).scrollTop(),
                        width:0,
                        height:0
                    }
                }
                $('#thumbox-image').animate(coord, {easing:getPlParam('closeImageEffect'), duration:getPlParam('zoomSpeed'), complete:function(){
                    $('#thumbox-image').remove();
                    _currentImage = false
                    if(open != undefined) {
                        openImageFromDock(open);
                    } else {
                        unbindKeyboardEvt();
                    }
                    if(toCloseDock != undefined) closeDock(); 
                }});
            }
        }
	
        var closeDock = function(){
            lockHandlers();
            if ($('#thumbox-image').size()) {
                closeImage(undefined, true);
            } else {
                unbindKeyboardEvt();
                if($('#thumbox-dock').size()){
                    hideControls();
                    $('#thumbox-dock').fadeOut(getPlParam('overlaySpeed'), function(){
                        hideLoader();
                        $('.thumbox-arrowdock, .thumbox-page > img').unbind();
                        $('#thumbox-dock').remove();
                        closeOverlay();
                    });
                } else {
                    closeOverlay();
                }
            }
        };
    };
})(jQuery,document)