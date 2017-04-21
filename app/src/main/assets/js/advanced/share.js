//-------------------------------------------------------------------------------------------
// Copyright 2012-2016 by ChartIQ, Inc.
// All rights reserved
//-------------------------------------------------------------------------------------------
/* removeIf(umd) */
(function (definition) {
	"use strict";

	if (typeof exports === "object" && typeof module === "object") {
		module.exports = definition( require('../core/master') );
	} else if (typeof define === "function" && define.amd) {
		define(["core/master"], definition);
	} else if (typeof window !== "undefined" || typeof self !== "undefined") {
		var global = typeof window !== "undefined" ? window : self;
		definition(global);
	} else {
		throw new Error("Only CommonJS, RequireJS, and <script> tags supported for share.js.");
	}
})/* endRemoveIf(umd) */(function(_exports){

	var CIQ=_exports.CIQ;
	var h2canvas;
	/**
	 * Manages chart sharing and uploading.
	 * @constructor
	 * @name CIQ.Share
	 */
	CIQ.Share=function(){};
	_exports.STXSocial=CIQ.Share;


	/**
	 * Create a png image or canvas of the current chart and everything inside of the container. This method keeps all of the html
	 * that is within the chart container as well as the chart. This does not seem to work with React or Safari.
	 * This function is asynchronous and requires a callback function. The callback will be passed
	 * a data object or canvas which can be sent to a server or converted to an image.
	 * @param {CIQ.ChartEngine} stx   Chart object
	 * @param {object} params
	 * @param {number} params.width
	 * @param {number} params.height
	 * @param {string} params.background
	 * @param {bolean} params.data If true returns the image data, otherwise, it returns the canvas
	 * @param {Function} cb  Callback when image is available fc(error,data) where data is the serialized image object or canvas
	 * @name CIQ.Share.FullChart2PNG
	 * @version ChartIQ plug-in
	 */

	CIQ.Share.FullChart2PNG=function(stx,params,cb){
		if(!stx || !stx.chart) return;
		//If we haven't loaded html2canvas, load it
		if(typeof html2canvas === "undefined")return loadHTML2Canvas(function(){
			return createHTML2Canvas(stx,params,cb);
		});
		h2canvas=html2canvas;
		createHTML2Canvas(stx,params,cb);
	};

	function createHTML2Canvas(stx,params,cb){
		if(!params) params = {};
		var recordsTurnedOff=[];
		//If you wish to hide elements from the picture tag them with a query selector and call it here.
		var hideItems = document.querySelectorAll("[cq-no-html2canvas]");

		for(var i=0;i<hideItems.length;i++){
			var item  = hideItems[i];
			if(item.style.display !== "none"){
				recordsTurnedOff.push({
					element:item,
					prevDisplay:item.style.display
				});
				item.style.display = "none";
			}
		}

		h2canvas(stx.chart.container, {
			allowTaint:false,
			logging:false,
			width:params.width?params.width:null,
			height:params.height?params.height:null,
			background:params.background?params.background:null,
			useCORS:true
		}).then(function(canvas){
			if(cb) {
				recordsTurnedOff.map(function(item,index){
					item.element.style.display = item.prevDisplay;
				});
				//return the full canvas if the data param is not true
				if(!params.data){
					return cb(null,canvas);
				}
				return cb(null,canvas.toDataURL('image/png'));
			}
		});
	}

	//Load HTML2Canvas
	function loadHTML2Canvas(cb){
		var root = getMyRoot();
		//Make sure HTML2Canvas is not already loaded
		if(typeof html2canvas === "undefined" ){
			CIQ.loadScript(root +"thirdparty/html2canvas.js",function(){
				//If we have require, use it
				if(typeof require !== "undefined"){
					return require(["html2canvas"],function(h2){
						h2canvas = h2;
						return cb();
					});
				}
				h2canvas = html2canvas;
				return cb();
			});
		}else{
			h2canvas = html2canvas;
			return cb();
		}
	}
	//get the location of this file
	function getMyRoot(){
		var sc = document.getElementsByTagName("script");
		for(var idx = 0; idx < sc.length; idx++){
			var s = sc[idx];
			if(s.src && s.src.indexOf("share.js")>-1){
				return s.src.replace(/advanced\/share\.js/,"");
			}
		}
		return null;
	}

	/**
	 * Create a png image based on the current chart. If widthPX and heightPX are passed in
	 * then the image will be scaled to the requested dimensions.
	 * This function is asynchronous and requires a callback function. The callback will be passed
	 * a data object which can be sent to a server or converted to an image.
	 * @param  {object}   stx           Chart object
	 * @param	 {object}		[parameters] 	Optional parameters to describe the image.
	 * @param  {number}   [parameters.widthPX]       Width of image to create. If passed then params.heightPX  will adjust to maintain ratio.
	 * @param  {number}   [parameters.heightPX]      Height of image to create. If passed then params.widthPX will adjust to maintain ratio.
	 * @param  {string}   [parameters.imageType]   Specifies the file format your image will be output in. The dfault is PNG and the format must be suported by your browswer.
	 * @param  {Function} cb            Callback when image is available fc(data) where data is the serialized image object
	 * @memberOf CIQ.Share
	 * @since 3.0.0 Function signature changed to take parameters.
	 * @version ChartIQ plug-in
	 */
	//imageType is in it's location so developers don't need to change their current code.
	CIQ.Share.createImage=function(stx, params, cb){
		var args = [].slice.call(arguments);
		cb=args.pop();
		if(params===null || typeof params!='object')params={widthPX:args[1], heightPX:args[2], imageType:args[3]};
		var widthPX=params.widthPX;
		var heightPX=params.heightPX;
		var imageType=params.imageType;

		// Set background for any part of canvas that is currently transparent NO LONGER NECESSARY????
		// CIQ.fillTransparentCanvas(stx.chart.context, stx.containerColor, stx.chart.canvas.width, stx.chart.canvas.height);

		// We use style height/width instead of the canvas width/height when the backing store is 2x on retina screens
		var renderedHeight=stx.chart.canvas.height;
		var renderedWidth=stx.chart.canvas.width;
		if(stx.chart.canvas.style.height){
			renderedHeight=CIQ.stripPX(stx.chart.canvas.style.height);
			renderedWidth=CIQ.stripPX(stx.chart.canvas.style.width);
		}
		if(widthPX && heightPX){
			renderedHeight=heightPX;
			renderedWidth=widthPX;
		}else if(heightPX){
			renderedWidth=stx.chart.canvas.width*(renderedHeight/stx.chart.canvas.height);
		}else if(widthPX){
			renderedWidth=widthPX;
			renderedHeight=stx.chart.canvas.height*(widthPX/stx.chart.canvas.width);
		}
		//var totalHeight=renderedHeight;
		var imageResult=imageType?"image/"+imageType:"image/png";
		// Render the canvas as an image
		var shareImage=document.createElement("img");
		shareImage.onload = function(){
			// Print the image on a new canvas of appropriate size
			CIQ.Share.FullChart2PNG(stx,{image:this,width:renderedWidth,height:renderedHeight},function(err,canvas){
				cb(canvas.toDataURL(imageResult));	// return the data
			});
		};
		shareImage.src=stx.chart.canvas.toDataURL(imageResult);
	};

	/**
	 * Uploads an image to a server. The callback will take two parameters. The first parameter is an error
	 * condition (server status), or null if there is no error. The second parameter (if no error) will contain
	 * the response from the server.
	 * 'payload' is an optional object that contains meta-data for the server. If payload exists then the image will be added as a member of the payload object, otherwise an object will be created
	 * 'dataImage' should be a data representation of an image created by the call canvas.toDataURL such as is returned by CIQ.Share.createImage
	 * If you are getting a status of zero back then you are probably encountering a cross-domain ajax issue. Check your access-control-allow-origin header on the server side

	 * @param  {string}   dataImage Serialized data for image
	 * @param  {string}   url       URL to send the image
	 * @param  {object}   [payload]   Any additional data to send to the server should be sent as an object.
	 * @param  {Function} cb        Callback when image is uploaded
	 * @memberOf CIQ.Share
	 * @version ChartIQ plug-in
	 */
	CIQ.Share.uploadImage=function(dataImage, url, payload, cb){
		if(!payload) payload={};
		payload.image=dataImage;
		var valid=CIQ.postAjax(url, JSON.stringify(payload), function(status, response){
			if(status!=200){
				cb(status, null);
				return;
			}
			cb(null, response);
		});
		if(!valid) cb(0, null);
	};

	/**
	 * Simple function that serves as a wrapper for createImage and uploadImage.
	 * It will create an image using the default parameters. If you wish to customize the image you must use createImage separately and then call uploadImage.
	 * (example python code available in our tutorials (http://chartiq.com/licensing/documentation/tutorial-Chart Sharing.html)
	 * @param {object}	stx Chart Object
	 * @param {object}  [override] Optional parameters that overwrite the default hosting location from https://share.chartiq.com to a custom location.
	 * @param {object}	[override.host]
	 * @param {object}	[override.path]
	 * @param {function}	cb Callback when the image is uploaded.
	 * @memberof CIQ.Share
	 * @since 2015-11-01
	 */
	CIQ.Share.shareChart=function(stx, override, cb){
		CIQ.Share.createImage(stx, {}, function(imgData){
			var id=CIQ.uniqueID();
			var host="https://share.chartiq.com";
			var url= host + "/upload/" + id;
			if(override){
				if(override.host) host=override.host;
				if(override.path) url=host+override.path+"/"+id;
			}
			var startOffset=stx.getStartDateOffset();
			var metaData={
				"layout": stx.exportLayout(),
				"drawings": stx.exportDrawings(),
				"xOffset": startOffset,
				"startDate": stx.chart.dataSegment[startOffset].Date,
				"endDate": stx.chart.dataSegment[stx.chart.dataSegment.length-1].Date,
				"id": id,
				"symbol": stx.chart.symbol
			};
			var payload={"id": id, "image": imgData, "config": metaData};
			CIQ.Share.uploadImage(imgData, url, payload, function(err, response){
				if(err!==null){
					CIQ.alert("error sharing chart: ",err);
				}else{
					cb(host+response);
				}
			});
			// end sample code to upload image to a server
		});
	};

	return _exports;
});
