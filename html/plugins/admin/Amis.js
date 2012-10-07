dojo.provide("plugins.admin.Amis");

// ALLOW THE USER TO ADD, REMOVE AND MODIFY StarAmis CLUSTER GROUPS

//dojo.require("dijit.dijit"); // optimize: load dijit layer
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.Textarea");
dojo.require("dojo.parser");
dojo.require("plugins.dnd.Source");

// FORM VALIDATION
dojo.require("plugins.form.ValidationTextarea");
dojo.require("plugins.form.EditForm");
dojo.require("plugins.core.Common");
dojo.require("dijit.form.ComboBox");

// HAS A
dojo.require("plugins.admin.AmiRow");

dojo.declare("plugins.admin.Amis",
	[ dijit._Widget, dijit._Templated, plugins.core.Common, plugins.form.EditForm ],
{

//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "admin/templates/ami.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

//addingUser STATE
addingUser : false,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ dojo.moduleUrl("plugins") + "/admin/css/ami.css"],

// PARENT WIDGET
parentWidget : null,

formInputs : {
// FORM INPUTS AND TYPES (word|phrase)
	aminame		:	"word",
	amiid		:	"word",
	amitype		:	"word",
	description	:	"phrase"
},

defaultInputs : {
// DEFAULT INPUTS
	aminame 	: 	"myAmi",
	amiid		:	"AMI ID",
	description	:	"Description"
},

requiredInputs : {
// REQUIRED INPUTS CANNOT BE ''
// combo INPUTS ARE AUTOMATICALLY NOT ''
	aminame 	: 1,
	amiid		: 1
},

invalidInputs : {
// THESE INPUTS ARE INVALID
	aminame 	: 	"myAmi",
	amiid		:	"AMI ID",
	description	:	"Description"
},

dataFields : [
	"amiid",
	"aminame"
],

rowClass : "plugins.admin.AmiRow",

avatarType : "parameters",

avatarItems: [ "aminame", "amiid", "amitype", "description"],

/////}}}

// STARTUP METHODS
constructor : function(args) {
	//console.log("Amis.constructor     plugins.admin.Amis.constructor");			
	// GET INFO FROM ARGS
	this.parentWidget = args.parentWidget;
	this.ami = args.parentWidget.ami;

	// LOAD CSS
	this.loadCSS();		
},

postCreate : function() {
	//console.log("Controller.postCreate    plugins.admin.Controller.postCreate()");

	this.startup();
},

startup : function () {
	console.log("Amis.startup    plugins.admin.Amis.startup()");

	// COMPLETE CONSTRUCTION OF OBJECT
	this.inherited(arguments);	 

	// ADD ADMIN TAB TO TAB CONTAINER		
	this.tabContainer.addChild(this.mainTab);
	this.tabContainer.selectChild(this.mainTab);

	// SET NEW PARAMETER FORM
	this.setForm();

	// SET CLEAR VALUES
	this.setClearValues();

	// SET DRAG SOURCE - LIST OF CLUSTERS
	this.setDragSource();

	console.log("Amis.startup    BEFORE this.setTrash(this.dataFields), I.E., plugins.form.DndTrash.startup()");
	this.setTrash(this.dataFields);	
	console.log("Amis.startup    AFTER this.setTrash(this.dataFields), I.E., plugins.form.DndTrash.startup()");

	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updateAmis");
},

updateAmis : function (args) {
// RELOAD THE COMBO AND DRAG SOURCE AFTER CHANGES
// TO DATA IN OTHER TABS
	console.log("Amis.updateAmis(args)");
	console.log("Amis.updateAmis    args: " );
	console.dir(args);
	
	if ( args.originator == this )
	{
		if ( args.reload == false )	return;
	}
	console.log("Amis.updateAmis    Calling setDragSource()");
	this.setDragSource();
},

setForm : function () {
// SET LISTENERS TO ACTIVATED SAVE BUTTON AND TO CLEAR DEFAULT TEXT
// WHEN INPUTS ARE CLICKED ON
	console.log("Amis.setForm    plugins.admin.Amis.setForm()");

	// SET ADD PARAMETER ONCLICK
	dojo.connect(this.addAmiButton, "onclick", dojo.hitch(this, "saveInputs", null, null));	
	// SET CLEARVALUE ON CLUSTER VALIDATION TEXT BOX
	dojo.connect(this.aminame, "onFocus", dojo.hitch(this, "clearValue", this.aminame, this.invalidInputs["aminame"]));

	// SET TRASH, ETC.
	this.inherited(arguments);
},

getItemArray : function () {
// GET A LIST OF DATA ITEMS - ONE FOR EACH ROW
	return Agua.getAmis();
},

setDragSource : function () {
// SET THE DRAG SOURCE WITH PARAMETER OBJECTS
	console.log("Amis.setDragSource     plugins.admin.Amis.setDragSource()");

	// GENERATE DND GROUP
	if ( this.dragSource == null ) {
		this.initialiseDragSource();
		this.setDragSourceCreator();
	}

	// DELETE EXISTING CONTENT
	this.clearDragSource();

	// INITIALISE USER INFO
	var itemArray = this.getItemArray();
	console.log("Amis.setDragSource     itemArray: " + dojo.toJson(itemArray));
	itemArray = this.sortHasharray(itemArray, 'aminame');
	console.log("Amis.setDragSource    itemArray: " + dojo.toJson(itemArray));
	
	// CHECK IF itemArray IS NULL
	if ( itemArray == null )
	{
		console.log("Amis.setDragSource     itemArray is null or empty. Returning.");
		return;
	}

	this.loadDragItems(itemArray);
},

saveInputs : function (inputs, reload) {
//	SAVE A PARAMETER TO Agua.parameters AND TO REMOTE DATABASE
	console.log("Amis.saveInputs    plugins.admin.Amis.saveInputs(inputs, reload)");
	console.log("Amis.saveInputs    inputs: " + dojo.toJson(inputs));
	console.log("Amis.saveInputs    reload: ");
	console.dir(reload);
	
	if ( this.saving == true )	return;
	this.saving = true;

	if ( inputs == null )
	{
		inputs = this.getFormInputs(this);
		console.log("Amis.saveInputs    inputs: ");
		console.dir({inputs:inputs});
		
		// RETURN IF INPUTS ARE NULL OR INVALID
		
		if ( inputs == null )
		{
			this.saving = false;
			return;
		}
	}
	console.log("Amis.saveInputs    inputs: " + dojo.toJson(inputs));
	Agua.addAmi(inputs);
	
	this.saving = false;

	// RELOAD RELEVANT DISPLAYS
	Agua.updater.update("updateAmis", {originator: this, reload: reload});

}, // Amis.saveInputs

deleteItem : function (amiObject) {
	console.log("Amis.deleteItem    plugins.admin.Amis.deleteItem(name)");
	console.log("Amis.deleteItem    amiObject: " + dojo.toJson(amiObject));

	Agua.removeAmi(amiObject);

	// RELOAD RELEVANT DISPLAYS
	Agua.updater.update("updateAmis", {originator: this, reload: false});
 	
}, // Amis.deleteItem

checkEnter : function (event) {
	console.log("Amis.checkEnter    event.keyCode: " + event.keyCode);

	if (event.keyCode == dojo.keys.ENTER)
	{
		this.saveInputs();
		dojo.stopEvent(event);
	}
},

checkEnterNodes : function (event) {
	console.log("Amis.checkEnterNodes    event.keyCode: " + event.keyCode);

	if (event.keyCode == dojo.keys.ENTER)
	{
		dojo.stopEvent(event);

		console.log("Amis.checkEnterNodes    setting document.body.focus()");
		document.body.focus();

		this.checkNodeNumbers();

		this.saveInputs();
	}
},
	
checkNodeNumbers : function () {
// SET MIN NODES VALUE TO SENSIBLE NUMBER 
	console.log("Amis.checkNodeNumbers     plugins.admin.Amis.checkNodeNumbers()");
	console.log("Amis.checkNodeNumbers     this.minnodes.get('value'): " + this.minnodes.get('value'));
	console.log("Amis.checkNodeNumbers     this.maxnodes.get('value'): " + this.maxnodes.get('value'));
	
	if (this.minnodes.value > this.maxnodes.value )
	{
		console.log("Amis.checkNodeNumbers     this.minnodes.value > this.maxnodes.value");
		this.minnodes.set('value', this.maxnodes.value);
	}
}



}); // plugins.admin.Amis

