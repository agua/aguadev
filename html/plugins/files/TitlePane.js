
dojo.provide("plugins.files.TitlePane");

// INHERITS
dojo.require("dijit.TitlePane");
dojo.require("plugins.core.Common");

// HAS A
dojo.require("plugins.files.FileDrag");

dojo.declare("plugins.files.TitlePane",
	[dijit.TitlePane, plugins.core.Common], {

// summary: A pane with a title on top, that can be opened or collapsed.

// className : String. Name of class
className: "filesTitlePane",

// title: String. Title of the pane
title: "",

// open: Boolean. Whether pane is opened or closed.
open: true,

// duration: Integer
//		Time in milliseconds to fade in/fade out
duration: dijit.defaultDuration,

// baseClass: String
//	The root className to use for the various states of this widget
baseClass: "filesTitlePane",

// templateString: String, set to null so that template is loaded from templatePath
templateString : null,

// templatePath: String, Path to html template
templateString:"<div dojoAttachPoint=\"containerNode\">\r\n\r\n\t\t<div dojoAttachEvent=\"onclick:toggle,onkeypress: _onTitleKey,onfocus:_handleFocus,onblur:_handleFocus\" tabindex=\"0\"\r\n\t\t\twaiRole=\"button\"\r\n\t\t\tclass=\"dijitTitlePaneTitle\" dojoAttachPoint=\"titleBarNode,focusNode\">\r\n\t\r\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" dojoAttachPoint=\"arrowNode\" class=\"filesArrowNode\" waiRole=\"presentation\">\r\n\t\t\t\t<span dojoAttachPoint=\"arrowNodeInner\" class=\"dijitArrowNodeInner\"></span>\r\n\t\t\t\t<img src=\"${_blankGif}\" dojoAttachPoint=\"refresh\" class=\"refreshTitlePane\" dojoAttachEvent=\"onclick:reload\">\r\n\t\r\n\t\t\t<span dojoAttachPoint=\"titleNode\" class=\"dijitTitlePaneTextNode\">\r\n\t\t\t\t\r\n\t\t\t\t<table cellspacing=\"0\" cellpadding=\"0\" dojoAttachPoint='header' class='header'>\r\n\t\t\t\t\t<tr>\r\n\t\t\t\t\t\t<td dojoAttachPoint=\"ownerNode\" class='owner' title='Owner'></td>\r\n\t\t\t\t\t\t<td dojoAttachPoint=\"nameNode\" class='name'></td>\r\n\t\t\t\t\t\t<td dojoAttachPoint=\"locationNode\" class='location'></td>\r\n\t\t\t\t\t\t<td dojoAttachPoint=\"descriptionNode\" class='description' title='Description'></td>\r\n\t\t\t\t\t</tr>\r\n\t\t\t\t</table>\r\n\t\t\t\t\r\n\t\t\t</span>\r\n\t\t\t\r\n\t\t</div>\r\n\t\t<div class=\"dijitTitlePaneContentOuter\" dojoAttachPoint=\"hideNode\">\r\n\t\t\t<div class=\"dijitReset\" dojoAttachPoint=\"wipeNode\">\r\n\t\t\t\t<div class=\"dijitTitlePaneContentInner\" dojoAttachPoint=\"containerNode\" waiRole=\"region\" tabindex=\"-1\">\r\n\t\t\t\t\t<!-- nested divs because wipeIn()/wipeOut() doesn't work right on node w/padding etc.  Put padding on inner div. -->\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n</div>\r\n",

// ccsFiles: Array. Paths to CSS files
cssFiles: [ dojo.moduleUrl("plugins") + "/files/css/titlepane.css" ],

// reloadCallback : Function. Function to call when 'reload' button clicked
reloadCallback : null,

// core: Object. { files: XxxxxFiles object, folders: Folders object, etc. }
core : null,

// directory: String. Filesystem location
directory: "",

// name: String. Name of filesystem
name: "",

// owner: String. Owner of filesystem
owner: "",

// location: String. Description of filesystem
location: "",

// description: String. Description of filesystem
description: "",

//// ownerNode: DIV element, insert owner name into its innerHTML
//ownerNode : null,

// size: Integer. Size of icons and fonts in title
size: 'normal',

// type: String. Type of filesystem
type: "",

attributeMap: dojo.delegate(dijit.layout.ContentPane.prototype.attributeMap, {
	title: { node: "titleNode", type: "innerHTML" },
	number: { node: "numberNode", type: "innerHTML" },
	tooltip: {node: "focusNode", type: "attribute", attribute: "title"},	// focusNode spans the entire width, titleNode doesn't
	id:""
}),

/////}}}
constructor: function(args){
	//console.log("TitlePane.constructor    args:");
	//console.dir({args:args});

	this.title = args.title || '';
	this.size = args.size || '';
	this.name = args.name || '';
	this.owner = args.owner || '';
	this.location = args.location || '';
	this.description = args.description || '';
	this.core = args.core;
},
postCreate: function(){	
	//////console.log("TitlePane.postCreate    this.directory: " + dojo.toJson(this.directory));

	// LOAD CSS
	this.loadCSS(this.cssFiles);

	if ( this.owner ) this.ownerNode.innerHTML = this.owner;
	if ( this.name ) this.nameNode.innerHTML = this.name;
	if ( this.location ) this.locationNode.innerHTML = this.location;
	if ( this.description ) this.descriptionNode.innerHTML = this.description;
	
	// SET TITLE FOR FILESYSTEM TYPE
	var defaultName = "Type of filesystem";
	//if ( this.type != null ) defaultName = this.type;
	if ( ! this.name ) this.nameNode.setAttribute('title', defaultName);

	// ADJUST SIZE IF SPECIFIED	
	if ( this.size == 'large' )
	{
		////console.log("TitlePane.postCreate    Setting size to 'large'");
		this.arrowNode.setAttribute('class', 'largeFilesArrowNode');
	}
	
	if ( this.size == 'larger' )
	{
		////console.log("TitlePane.postCreate    Setting size to 'larger'");
		this.arrowNode.setAttribute('class', 'largerFilesArrowNode');
	}

	console.log("TitlePane.postCreate    BEFORE this.inherited(arguments)");
	this.inherited(arguments);

	console.log("TitlePane.postCreate    AFTER this.inherited(arguments)");
},
reload : function (event) {
// RELOAD FileDrag OBJECT INSIDE TITLE PANE	
	//console.log("TitlePane.reload    TitlePane.reload()");
	event.stopPropagation();

	//console.log("TitlePane.reload    this.directory: ");
	//console.dir({this_directory:this.directory});

	if ( this.reloadCallback != null ) {
		//console.log("TitlePane.reload    Doing this.reloadCallback()");
		this.reloadCallback();
		return;
	}

	// REMOVE EXISTING FILE DRAG
	this.clear();
	
	// CREATE FILE DRAG	
	var master = this.master;
	//console.log("TitlePane.reload    Doing this.core[" + master + "].createSourceFileDrag()");
	var fileDrag = this.core[master].createFileDrag(this.directory);
	
	// ADD fileDrag TO TITLE PANE
	this.containerNode.appendChild(fileDrag.domNode);	
},
clear : function () {
	while ( this.containerNode.firstChild ) {
		var fileDrag = dijit.getEnclosingWidget(this.containerNode.firstChild);
		//console.log("TitlePane.clear    Doing fileDrag.destroy():");
		//console.dir({fileDrag:fileDrag});
		fileDrag.destroy();
	}
},
_handleFocus: function(/*Event*/ e){
	// summary: handle blur and focus for this widget
	
	// add/removeClass is safe to call without hasClass in this case
	dojo[(e.type == "focus" ? "addClass" : "removeClass")](this.focusNode, this.baseClass + "Focused");
},

destroyRecursive : function () {
	//console.log("TitlePane.destroyRecursive    Doing this.inherited(arguments)");
	this.inherited(arguments);
}

});
