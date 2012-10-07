dojo.provide("plugins.admin.Apps");

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

// SYNC DIALOG
dojo.require("plugins.dijit.SyncDialog");

// HAS A
dojo.require("plugins.admin.AppRow");

dojo.declare("plugins.admin.Apps",
	[ dijit._Widget, dijit._Templated, plugins.core.Common, plugins.form.EditForm ],
{
		
//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "admin/templates/apps.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

//addingApp STATE
addingApp : false,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ dojo.moduleUrl("plugins", "admin/css/apps.css") ],

// PARENT WIDGET
parentWidget : null,

formInputs : {
	"name"		: "word",
	"type"		: "word",
	"executor"	: "word",
	"package"	: "word",
	"location"	: "word",
	"localonly"	: "word",
	"description": "phrase",
	"notes": "phrase",
	"url": "word"
},

requiredInputs : {
// REQUIRED INPUTS CANNOT BE ''
	name : 1,
	type : 1, 
	location: 1
},

invalidInputs : {
// THESE INPUTS ARE INVALID
	name 		: 	"Name",
	type 		: 	"Type", 
	executor	: 	"Executor", 
	packageCombo: 	"Package",
	location	: 	"Location",
	description	: 	"Description",
	notes		: 	"Notes",
	url			: 	"URL"
},

defaultInputs : {
// THESE INPUTS ARE default
	name 		: 	"Name",
	type 		: 	"Type", 
	executor	: 	"Executor", 
	packageCombo: 	"Package",
	location	: 	"Location",
	description	: 	"Description",
	notes		: 	"Notes",
	url			: 	"URL"
},

dataFields : ["name", "type", "location"],

avatarItems : [ "name", "description" ],

rowClass : "plugins.admin.AppRow",

// dragType: array
// List of permitted dragged items allowed to be dropped
dragTypes : ["app"],

/////}}}
constructor : function(args) {
	//////////console.log("Apps.constructor     plugins.admin.Apps.constructor");			
	// GET INFO FROM ARGS
	this.parentWidget = args.parentWidget;
	this.apps = args.parentWidget.apps;

},
postCreate : function() {
	//////////console.log("Controller.postCreate    plugins.admin.Controller.postCreate()");
	// LOAD CSS
	this.loadCSS();		

	this.startup();
},
startup : function () {
	//////////console.log("Apps.startup    plugins.admin.Apps.startup()");

	console.group("Apps-" + this.id + "    startup");

	// COMPLETE CONSTRUCTION OF OBJECT
	this.inherited(arguments);	 

	// ADD TO TAB CONTAINER		
	this.tabContainer.addChild(this.mainTab);
	this.tabContainer.selectChild(this.mainTab);

	// SET APPS COMBO - WILL CASCADE TO setDragSource
	this.setPackageCombo();

	// SET NEW APP FORM
	this.setForm();

	// SET TRASH
	this.setTrash(this.dataFields);	

	// SET SYNC APPS BUTTON
	this.setSyncApps();
	
	// SET SYNC DIALOG
	this.setSyncDialog();

	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updateApps");
	
	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updateSyncApps");
	
	console.groupEnd("Apps-" + this.id + "    startup");
},
updateApps : function (args) {
// RELOAD GROUP COMBO AND DRAG SOURCE AFTER CHANGES
// TO SOURCES OR GROUPS DATA IN OTHER TABS
	console.log("Apps.updateApps    Apps.updateApps(args)");
	console.log("Apps.updateApps    args:");
	console.dir(args);

	// SET DRAG SOURCE
	if ( args != null && args.reload == false )	return;
	console.log("Apps.updateApps    Calling setDragSource()");
	this.setAppTypesCombo();
},
updateSyncApps : function (args) {
	console.warn("Apps.updateSyncApps    args:");
	console.dir({args:args});

	this.setSyncApps();
},
// DISABLE SYNC APPS BUTTON IF NO HUB LOGIN
setSyncApps : function () {
	var hub = Agua.getHub();
	console.log("Apps.setSyncApps    hub:")
	console.dir({hub:hub});

	if ( ! hub.login || ! hub.token ) {
		this.disableSyncApps();
	}
	else {
		this.enableSyncApps();
	}
},
setSyncDialog : function () {
	console.log("Apps.loadSyncDialog    plugins.admin.Apps.setSyncDialog()");
	
	var enterCallback = function (){};
	var cancelCallback = function (){};
	var title = "Sync";
	var header = "Sync Apps";
	
	this.syncDialog = new plugins.dijit.SyncDialog(
		{
			title 				:	title,
			header 				:	header,
			parentWidget 		:	this,
			enterCallback 		:	enterCallback
		}			
	);

	console.log("Apps.loadSyncDialog    this.syncDialog:");
	console.dir({this_syncDialog:this.syncDialog});

},
showSyncDialog : function () {
	var disabled = dojo.hasClass(this.syncAppsButton, "disabled");
	console.log("Apps.loadSyncDialog    disabled: " + disabled);
	
	if ( disabled ) {
		console.log("Apps.loadSyncDialog    SyncApps is disabled. Returning");
		return;
	}
	
	var title = "Sync Apps";
	var header = "";
	var message = "";
	var details = "";
	var enterCallback = dojo.hitch(this, "syncApps");
	this.loadSyncDialog(title, header, message, details, enterCallback)
},
loadSyncDialog : function (title, header, message, details, enterCallback) {
	console.log("Apps.loadSyncDialog    title: " + title);
	console.log("Apps.loadSyncDialog    header: " + header);
	console.log("Apps.loadSyncDialog    message: " + message);
	console.log("Apps.loadSyncDialog    details: " + details);
	console.log("Apps.loadSyncDialog    enterCallback: " + enterCallback);

	this.syncDialog.load(
		{
			title 			:	title,
			header 			:	header,
			message 		:	message,
			details 		:	details,
			enterCallback 	:	enterCallback
		}			
	);
},
disableSyncApps : function () {
	dojo.addClass(this.syncAppsButton, "disabled");
	dojo.attr(this.syncAppsButton, "title", "Input AWS private key and public certificate to enable Sync");
},
enableSyncApps : function () {
	dojo.removeClass(this.syncAppsButton, "disabled");
	dojo.attr(this.syncAppsButton, "title", "Click to sync apps to biorepository");
},
// SYNC APPS
syncApps : function (inputs) {
	console.log("Hub.syncApps    inputs: ");
	console.dir({inputs:inputs});
	
	if ( this.syncingApps == true ) {
		console.log("Hub.syncApps    this.syncingApps: " + this.syncingApps + ". Returning.");
		return;
	}
	this.syncingApps = true;
	
	var query = new Object;
	query.username 			= Agua.cookie('username');
	query.sessionId 		= Agua.cookie('sessionId');
	query.message			= inputs.message;
	query.details			= inputs.details;
	query.hubtype			= "github";
	query.mode 				= "syncApps";
	console.log("Hub.syncApps    query: ");
	console.dir({query:query});
	
	// SEND TO SERVER
	var url = Agua.cgiUrl + "workflow.cgi?";
	var thisObj = this;
	dojo.xhrPut(
		{
			url: url,
			contentType: "json",
			putData: dojo.toJson(query),
			load: function(response, ioArgs) {
				thisObj.syncingApps = false;

				console.log("Apps.syncApps    OK. response:")
				console.dir({response:response});

				Agua.toast(response);
			},
			error: function(response, ioArgs) {
				thisObj.syncingApps = false;

				console.log("Apps.syncApps    ERROR. response:")
				console.dir({response:response});
				Agua.toast(response);
			}
		}
	);
},
toggle : function () {
// TOGGLE HIDDEN DETAILS
	//console.log("Packages.toggle    plugins.workflow.Packages.toggle()");
	////console.log("Packages.toggle    this.description: " + this.description);

	if ( this.togglePoint.style.display == 'inline-block' )	
		this.togglePoint.style.display='none';
	else
		this.togglePoint.style.display = 'inline-block';
},
setPackageCombo : function (type) {
// SET PARAMETERS COMBO BOX
	//console.log("Parameters.setPackageCombo     plugins.admin.Parameters.setPackageCombo()");

	// GET PARAMETERS NAMES		
	var apps = Agua.getApps();
	console.log("Parameters.setPackageCombo     apps:");
	console.dir({apps:apps});

	var packageArray = this.hashArrayKeyToArray(apps, "package");
	packageArray = this.uniqueValues(packageArray);
	console.log("Parameters.setPackageCombo     packageArray:");
	console.dir({packageArray:packageArray});

	// SET STORE
	var data = {identifier: "name", items: []};
	for ( var i = 0; i < packageArray.length; i++ )
	{
		data.items[i] = { name: packageArray[i]	};
	}
	//////console.log("Parameters.setPackageCombo     data: " + dojo.toJson(data));
	var store = new dojo.data.ItemFileWriteStore(	{	data: data	}	);
	//////console.log("Parameters.setPackageCombo     store: " + store);

	// SET COMBO
	this.packageCombo.store = store;
	this.packageCombo.startup();
	////console.log("Parameters.setPackageCombo::setCombo     AFTER this.packageCombo.startup()");th

	// SET COMBO VALUE
	var firstValue = packageArray[0];
	this.packageCombo.set('value', firstValue);
	////console.log("Parameters.setPackageCombo::setCombo     AFTER this.packageCombo.setValue(firstValue)");

	// SET PARAMETER NAMES COMBO
	this.setAppTypesCombo();
},
setAppTypesCombo : function () {
	// SET APPS COMBO BOX WITH APPLICATION NAME VALUES
	console.log("Apps.setAppTypesCombo     plugins.admin.Apps.setAppTypesCombo()");

	// GET APPS NAMES
	var apps = Agua.getApps();
	console.log("Apps.setAppTypesCombo     this: ");
	;
	
	var packageName = this.packageCombo.get('value');
	console.log("Apps.setAppTypesCombo     packageName: " + packageName);
	
	var keys = ['package'];
	var values = [ packageName ];
	apps = this.filterByKeyValues(apps, keys, values);

	var typesArray = this.hashArrayKeyToArray(apps, "type");
	typesArray = this.uniqueValues(typesArray);
	console.log("Apps.setAppTypesCombo     typesArray.length: " + typesArray.length);

	typesArray = this.sortNoCase(typesArray);
	typesArray.splice(0,0, 'Order by Type (A-Z)');
	typesArray.splice(0,0, 'Order by Name (A-Z)');
	
	// SET STORE
	var data = {identifier: "name", items: []};
	for ( var i = 0; i < typesArray.length; i++ )
	{
		data.items[i] = { name: typesArray[i]	};
	}
	var store = new dojo.data.ItemFileWriteStore(	{	data: data	}	);
	
	// SET COMBO
	this.appsCombo.store = store;
	this.appsCombo.startup();

	// SET COMBO VALUE
	var firstValue = typesArray[0];
	this.appsCombo.set('value', firstValue);
	////console.log("Apps.setAppTypesCombo::setCombo     AFTER this.appsCombo.set('value',firstValue)");

	this.setDragSource();
},
setForm : function () {
	// SET ADD ONCLICK
	dojo.connect(this.addAppButton, "onclick", dojo.hitch(this, "saveInputs", null, { reload: true }));

	// SET ONCLICK TO CANCEL INVALID TEXT
	this.setClearValues();

	// CHAIN TOGETHER INPUTS ON 'RETURN' KEYPRESS
	this.chainInputs(["name", "type", "executor", "package", "location", "description", "notes", "url", "addAppButton"]);	
},
getItemArray : function () {
	//console.log("Apps.getItemArray     plugins.admin.Apps.getItemArray()");

	var itemArray = Agua.getApps();
	//console.log("Apps.getItemArray     itemArray: " + dojo.toJson(itemArray));
	console.log("Apps.getItemArray    itemArray.length: " + itemArray.length);
	
	var type = this.appsCombo.get('value');
	//console.log("Apps.getItemArray     type: " + type);
	if ( type == "Order by Name (A-Z)" )
	{
		itemArray = this.sortHasharray(itemArray, 'name');
		//console.log("Apps.getItemArray     Name A-Z itemArray: " + dojo.toJson(itemArray));
	}
	else if ( type == "Order by Type (A-Z)" )
	{
		itemArray = this.sortHasharray(itemArray, 'type');
		//console.log("Apps.getItemArray     Type A-Z itemArray: " + dojo.toJson(itemArray));
	}
	else
	{
		for ( var i = 0; i < itemArray.length; i++ )
		{
			if ( itemArray[i].type != type )
			{
				itemArray.splice(i, 1);
				i--;
			}
		}
		//console.log("Apps.getItemArray     Type " + type + " itemArray: " + dojo.toJson(itemArray));
	
	}	
	//console.log("Apps.getItemArray    Type " + type + " itemArray.length: " + itemArray.length);
	console.log("Apps.setAppTypesCombo     RETURNING itemArray.length: " + itemArray.length);
	
	return itemArray;
},
changeDragSource : function () {
	console.log("Apps.changeDragSource     plugins.admin.Apps.changeDragSource()");
	console.log("Apps.changeDragSource     this.dragSourceOnchange: " + this.dragSourceOnchange);
	
	//if ( this.dragSourceOnchange == false )
	//{
	//	console.log("Apps.changeDragSource     this.dragSourceOnchange is false. Returning");
	//	this.dragSourceOnchange = true;
	//	return;
	//}
	
	console.log("Apps.changeDragSource     Doing this.setDragSource");
	this.setDragSource();
},
deleteItem : function (appObject) {
// DELETE APPLICATION FROM Agua.apps OBJECT AND IN REMOTE DATABASE
	//console.log("Apps.deleteItem    plugins.admin.Apps.deleteItem(name)");
	//console.log("Apps.deleteItem    name: " + name);

	// CLEAN UP WHITESPACE
	appObject.name = appObject.name.replace(/\s+$/,'');
	appObject.name = appObject.name.replace(/^\s+/,'');

	// REMOVING APP FROM Agua.apps
	Agua.removeApp(appObject, "custom");
	
	var url = Agua.cgiUrl + "admin.cgi?";
	//console.log("Apps.deleteStore     url: " + url);		

	// CREATE JSON QUERY
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.mode = "deleteApp";
	query.data = appObject;
	//console.log("Apps.deleteItem    query: " + dojo.toJson(query));
	
	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			putData: dojo.toJson(query),
			load: function(response, ioArgs) {
				//console.log("Apps.deleteItem    JSON Post worked.");
				return response;
			},
			error: function(response, ioArgs) {
				//console.log("Apps.deleteItem    Error with JSON Post, response: " + response + ", ioArgs: " + ioArgs);
				return response;
			}
		}
	);

	// RELOAD RELEVANT DISPLAYS
	Agua.updater.update("updateApps");

}, // Apps.deleteItem
saveInputs : function (inputs, updateArgs) {
//	SAVE AN APPLICATION TO Agua.apps AND TO REMOTE DATABASE
	console.log("Apps.saveInputs    plugins.admin.Apps.saveInputs(inputs)");
	console.log("Apps.saveInputs    BEFORE inputs: ");
	console.dir({inputs:inputs});

	if ( this.savingApp == true )	return;
	this.savingApp = true;

	if ( inputs == null )
	{
		inputs = this.getFormInputs(this);

		// RETURN IF INPUTS ARE NULL
		if ( inputs == null )
		{
			this.savingApp = false;
			return;
		}
	}
	console.log("Apps.saveInputs    AFTER inputs: ");
	console.dir({inputs:inputs});

	// REMOVE ORIGINAL APPLICATION OBJECT FROM Agua.apps 
	// THEN ADD NEW APPLICATION OBJECT TO Agua.apps
	Agua.removeApp({ name: inputs.name });
	Agua.addApp(inputs);

	// CREATE JSON QUERY
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.mode = "saveApp";
	query.data = inputs;
	var url = Agua.cgiUrl + "admin.cgi?";
	//////////console.log("Apps.saveInputs    query: " + dojo.toJson(query));
	
	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			putData: dojo.toJson(query),
			timeout: 15000,
			load: function(response, ioArgs) {
				//////////console.log("Apps.saveInputs    JSON Post worked.");
				return response;
			},
			error: function(response, ioArgs) {
				//////////console.log("Apps.saveInputs    Error with JSON Post, response: " + response + ", ioArgs: " + ioArgs);
				return response;
			}
		}
	);

	this.savingApp = false;

	// SUBSCRIBE TO UPDATES
	// NB: updateArgs.reload = true
	Agua.updater.update("updateApps", updateArgs);

}, // Apps.saveInputs
getFormInputs : function (widget) {
// GET INPUTS FROM THE EDITED ITEM
	console.log("Apps.getFormInputs    plugins.admin.Apps.getFormInputs(textarea)");
	console.log("Apps.getFormInputs    widget: " + widget);
	console.dir({widget:widget});

	var inputs = new Object;
	console.log("Apps.getFormInputs    inputs: " + inputs);
	console.dir({inputs:inputs});

	for ( var name in this.formInputs )
	{
		console.log("Apps.getFormInputs    DOING inputs[" + name + "]");
		var value;
		if ( name == "localonly" )
		{
			value = 0;
			if ( widget[name].getValue() == "on" )
			{
				value = 1;
			}
		}
		else if ( name == "package" ) {
			value = this.processWidgetValue(widget, "packageCombo");
		}
		else
		{
			console.log("Apps.getFormInputs    DOING processWidgetValue. widget: ");
			console.dir({widget:widget});
			
			value = this.processWidgetValue(widget, name);
		}
		inputs[name] = value;
		console.log("Apps.getFormInputs    inputs[" + name + "]: " + inputs[name]);
	}

	inputs = this.checkInputs(widget, inputs);
	console.log("Apps.getFormInputs    FINAL inputs: ");
	console.dir({inputs:inputs});

	return inputs;
},
checkInputs : function (widget, inputs) {
// CHECK INPUTS ARE VALID, IF NOT RETURN NULL
	console.log("Apps.checkInputs    inputs: ");
	console.dir({inputs:inputs});
	
	this.allValid = true;	
	for ( var key in this.formInputs )
	{
		var value = inputs[key];
		console.log("Apps.checkInputs    Checking " + key + ": " + value);
		
		if ( key == "package" ) {
			if ( this.isValidInput("packageCombo", value) ) {
				this.setValid(widget["packageCombo"]);
			}
			else {
				this.setInvalid(widget["packageCombo"]);
				this.allValid = false;
				continuev;
			}
		}
		else if ( this.isValidInput(key, value) ) {
			console.log("Apps.checkInputs    removing 'invalid' class for " + key + ": " + value);
			this.setValid(widget[key]);
		}
		else {
			console.log("Apps.checkInputs    adding 'invalid' class for name " + key + ", value " + value);
			
			this.setInvalid(widget[key]);
			this.allValid = false;
		}
	}
	console.log("Apps.checkInputs    this.allValid: " + this.allValid);
	if ( this.allValid == false )	return null;

	for ( var key in this.formInputs )
	{
		console.log("Apps.checkInputs    BEFORE convert, inputs[key]: " + dojo.toJson(inputs[key]));
		inputs[key] = this.convertAngleBrackets(inputs[key], "htmlToText");
		//inputs[key] = this.convertBackslash(inputs[key], "textToHtml");
		console.log("Apps.checkInputs    AFTER convert, inputs[key]: " + dojo.toJson(inputs[key]));
	}

	return inputs;
}



}); // plugins.admin.Apps

