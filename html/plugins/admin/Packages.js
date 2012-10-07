dojo.provide("plugins.admin.Packages");

// ALLOW THE USER TO ADD, REMOVE AND MODIFY APPS

// EXTERNAL MODULES
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");
dojo.require("dojo.parser");
dojo.require("dojo.dnd.Source");
dojo.require("dojo.data.ItemFileWriteStore");

// INTERNAL MODULES
dojo.require("plugins.core.Common");
dojo.require("dijit.form.ComboBox");
dojo.require("plugins.form.EditForm");

// HAS A
dojo.require("plugins.admin.PackageRow");

dojo.declare("plugins.admin.Packages",
	[ dijit._Widget, dijit._Templated, plugins.core.Common, plugins.form.EditForm ],
{
		
//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "admin/templates/packages.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

//addingPackage STATE
addingPackage : false,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ dojo.moduleUrl("plugins", "admin/css/packages.css") ],

// PARENT WIDGET
parentWidget : null,

formInputs : {
	"package"		:	"word",
	"version"		:	"word",
	"privacy"		:	"word",
	"opsdir"		:	"word",
	"installdir"	:	"word",
	"description"	:	"phrase",
	"notes"			:	"phrase",
	"url"			:	"word"
},

requiredInputs : {
// REQUIRED INPUTS CANNOT BE ''
	'package' 	:	1,
	version 	:	1, 
	opsdir		:	1,
	installdir	:	1
},

invalidInputs : {
// THESE INPUTS ARE INVALID
	'package' 	: 	"Name",
	version     : 	"Version", 
	privacy		: 	"Privacy",
	opsdir		: 	"Opsdir",
	installdir	: 	"Installdir",
	description	: 	"Description",
	notes		: 	"Notes",
	url			: 	"URL"
},

defaultInputs : {
// THESE INPUTS ARE default
	'package' 	: 	"Name",
	version 	: 	"Version", 
	privacy		: 	"Privacy",
	opsdir		: 	"Opsdir",
	installdir	: 	"Installdir",
	description	: 	"Description",
	notes		: 	"Notes",
	url			: 	"URL"
},

dataFields : ["package", "version", "privacy", "opsdir", "installdir"],

avatarItems : [ "package", "description" ],

rowClass : "plugins.admin.PackageRow",

/////}}}
constructor : function(args) {
	////////////console.log("Packages.constructor     plugins.admin.Packages.constructor");			
	// GET INFO FROM ARGS
	this.parentWidget = args.parentWidget;
	this.packages = args.parentWidget.packages;

},
postCreate : function() {
	////////////console.log("Controller.postCreate    plugins.admin.Controller.postCreate()");
	// LOAD CSS
	this.loadCSS();		

	this.startup();
},
startup : function () {
	//console.log("Packages.startup    plugins.admin.Packages.startup()");

	// COMPLETE CONSTRUCTION OF OBJECT
	this.inherited(arguments);	 

	// ADD TO TAB CONTAINER		
	this.tabContainer.addChild(this.mainTab);
	this.tabContainer.selectChild(this.mainTab);

	// SET DRAG SOURCE
	this.setDragSource();

	// SET NEW APP FORM
	this.setForm();

	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updatePackages");

	// SET TRASH
	this.setTrash(this.dataFields);	
},
updatePackages : function (args) {
// RELOAD GROUP COMBO AND DRAG SOURCE AFTER CHANGES
// TO SOURCES OR GROUPS DATA IN OTHER TABS
	console.log("Packages.updatePackages    Packages.updatePackages(args)");
	console.log("Packages.updatePackages    args:");
	console.dir(args);

	// CHECK ARGS
	if ( args != null && args.reload == false )	return;
	if ( args.originator && args.originator == this )	return;
	
	// SET DRAG SOURCE
	console.log("Packages.updatePackages    Calling setDragSource()");
	
	this.setDragSource();
},
setForm : function () {
	// SET ADD ONCLICK
	dojo.connect(this.addPackageButton, "onclick", dojo.hitch(this, "saveInputs", null, { reload: true }));

	// SET ONCLICK TO CANCEL INVALID TEXT
	this.setClearValues();

	// CHAIN TOGETHER INPUTS ON 'RETURN' KEYPRESS
	this.chainInputs(["package", "type", "executor", "version", "location", "description", "notes", "url", "addPackageButton"]);	
},
getItemArray : function () {
	//console.log("Packages.getItemArray     plugins.admin.Packages.getItemArray()");
	var itemArray = Agua.getPackages();
	//console.log("Packages.getItemArray     itemArray: " + dojo.toJson(itemArray));
	console.log("Packages.getItemArray    itemArray.length: " + itemArray.length);

	itemArray = itemArray.sort();
	return itemArray;
},
changeDragSource : function () {
	//console.log("Packages.changeDragSource     plugins.admin.Packages.changeDragSource()");
	//console.log("Packages.changeDragSource     this.dragSourceOnchange: " + this.dragSourceOnchange);
	
	//if ( this.dragSourceOnchange == false )
	//{
	//	//console.log("Packages.changeDragSource     this.dragSourceOnchange is false. Returning");
	//	this.dragSourceOnchange = true;
	//	return;
	//}
	
	//console.log("Packages.changeDragSource     Doing this.setDragSource");
	this.setDragSource();
},
deleteItem : function (packageObject) {
// DELETE APPLICATION FROM Agua.packages OBJECT AND IN REMOTE DATABASE
	////console.log("Packages.deleteItem    plugins.admin.Packages.deleteItem(package)");
	////console.log("Packages.deleteItem    package: " + package);

	// CLEAN UP WHITESPACE
	packageObject["package"] = packageObject["package"].replace(/\s+$/,'');
	packageObject["package"] = packageObject["package"].replace(/^\s+/,'');

	// REMOVING APP FROM Agua.packages
	Agua.removePackage(packageObject, "custom");
	
	var url = Agua.cgiUrl + "admin.cgi?";
	////console.log("Packages.deleteStore     url: " + url);		

	// CREATE JSON QUERY
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.mode = "removePackage";
	query.data = packageObject;
	console.log("Packages.deleteItem    query: " + dojo.toJson(query));

	this.doPut({url: url, query: query, doToast: false});
	
	// RELOAD RELEVANT DISPLAYS
	Agua.updater.update("updatePackages", { originator: this });

	// RELOAD RELEVANT DISPLAYS
	
}, // Packages.deleteItem
saveInputs : function (inputs, updateArgs) {
//	SAVE AN APPLICATION TO Agua.packages AND TO REMOTE DATABASE
	console.log("Packages.saveInputs    caller: " + this.saveInputs.caller.nom);
	console.log("Packages.saveInputs    inputs: ");
	console.dir({inputs:inputs});

	if ( this.savingPackage == true )	return;
	this.savingPackage = true;

	if ( inputs == null )
	{
		inputs = this.getFormInputs(this);

		// RETURN IF INPUTS ARE NULL
		if ( inputs == null )
		{
			this.savingPackage = false;
			return;
		}
	}
	console.log("Packages.saveInputs    FINAL inputs: ");
	console.dir({inputs:inputs});

	// RETURN IF PACKAGE ALREADY EXISTS
	var isPackage = Agua.isPackage(inputs["package"]);
	console.log("Packages.saveInputs    isPackage: " + isPackage)
	if ( isPackage ) {
		console.log("Packages.saveInputs    package exits already. Returning");
		this.setInvalid(this["package"]);
		Agua.toastMessage({
			message: "Package exists already: " + inputs["package"],
			type: "error"
		});
		this.savingPackage = false;
		return;
	}	

	inputs.owner = Agua.cookie('username');
	inputs.username = Agua.cookie('username');

	// REMOVE ORIGINAL APPLICATION OBJECT FROM Agua.packages 
	// THEN ADD NEW APPLICATION OBJECT TO Agua.packages
	Agua.removePackage({ thisPackage: inputs["package"] });
	Agua.addPackage(inputs);

	// CREATE JSON QUERY
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.mode = "addPackage";
	query.data = inputs;
	var url = Agua.cgiUrl + "admin.cgi?";
	////////////console.log("Packages.saveInputs    query: " + dojo.toJson(query));
	
	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			putData: dojo.toJson(query),
			//timeout: 15000,
			handle: function(response, ioArgs) {
				////////////console.log("Packages.saveInputs    JSON Post worked.");
				return response;
			},
			error: function(response, ioArgs) {
				////////////console.log("Packages.saveInputs    Error with JSON Post, response: " + response + ", ioArgs: " + ioArgs);
				return response;
			}
		}
	);

	this.savingPackage = false;

	// TRIGGER UPDATES
	// NB: updateArgs.reload = true
	Agua.updater.update("updatePackages", updateArgs);

}, // Packages.saveInputs
toggle : function () {
// TOGGLE HIDDEN DETAILS	
	////console.log("Packages.toggle    plugins.workflow.Packages.toggle()");
	//////console.log("Packages.toggle    this.description: " + this.description);
	var array = [ "descriptionTitle", "description", "notesTitle", "notes", "urlTitle" , "url" ];
	
	for ( var i in array )
	{
		//console.log("PackageRow.toggle    this[" + array[i] + "] :" + this[array[i]]);
		if ( this[array[i]].style.display == 'inline' )	
			this[array[i]].style.display='none';
		else
			this[array[i]].style.display = 'inline';
	}
},
getFormInputs : function (widget) {
// GET INPUTS FROM THE EDITED ITEM
	////console.log("Packages.getFormInputs    plugins.admin.Packages.getFormInputs(textarea)");
	//////console.log("Packages.getFormInputs    widget: " + widget);
	var inputs = new Object;
	for ( var name in this.formInputs )
	{
		inputs[name]  = this.processWidgetValue(widget, name);
		////console.log("Packages.getFormInputs    inputs[name]: " + inputs[name]);
	}

	inputs = this.checkInputs(widget, inputs);
	////console.log("Packages.getFormInputs    FINAL inputs: " + dojo.toJson(inputs));

	return inputs;
}


}); // plugins.admin.Packages
