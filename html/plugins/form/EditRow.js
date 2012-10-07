dojo.provide("plugins.form.EditRow");

// PROVIDES FORM INPUT AND ROW EDITING WITH VALIDATION
// INHERITING CLASSES MUST IMPLEMENT saveInputs AND deleteItem METHODS
// THE dnd DRAG SOURCE MUST BE this.dragSourceWidget IF PRESENT
/*
	EDIT ROW FUNCTIONALITY:
	
		1. SAVE IF 'RETURN' PRESSED,
	
		2. EXIT WITHOUT CHANGES IF 'ESCAPE' PRESSED
	
	CONVERSION OF BACKSLASHES:
		
		1. EVERY '\' VISIBLE IN HTML IS ACTUALLY '\\'
		
		2. THIS '\\' DISPLAYS AS A '\' WHEN INSERTED INTO THE TEXTAREA

		3. CONVERT INTO A '\\\\' IN THE MYSQL INSERT COMMAND

*/


// EXTERNAL MODULES
dojo.require("dojo.dnd.Source");

// INTERNAL MODULES
dojo.require("plugins.core.Common");

dojo.declare("plugins.form.EditRow",
	[ plugins.core.Common ],
{

// ROW EDITING STATE
editingRow : false,

// WIDGET OWNING EDITED NODE
rowWidget : null,

// EDITED NODE
node : null,

////}}}

constructor : function(args) {
	////console.log("EditRow.constructor     plugins.form.EditRow.constructor");	

	this.setTextarea();
	this.setEventHandlers();
},

postCreate : function() {
	////console.log("EditRow.postCreate    plugins.admin.Controller.postCreate()");
	this.startup();
},

startup : function () {
	////console.log("EditRow.startup    plugins.form.EditRow.startup()");
},

setTextarea : function () {
	////console.log("EditRow.setTextarea    plugins.form.EditRow.setTextarea()");
	this.textarea = document.createElement('textarea');
	dojo.addClass(this.textarea, 'editRow');
	dojo.attr(this.textarea, 'style', 'visibility: hidden');	
},

setEventHandlers : function () {
// SET onkeypress AND onblur LISTENERS
	////console.log("EditRow.setEventHandlers    plugins.form.EditRow.setEventHandlers()");
	dojo.connect(this.textarea, "onblur", dojo.hitch(this, "handleOnBlur"));
	////console.log("EditRow.setEventHandlers    plugins.form.EditRow.setEventHandlers()");
	dojo.connect(this.textarea, "onkeypress", dojo.hitch(this, "handleOnKeyPress"));
},

editRow : function (rowWidget, node) {
	////console.log("EditRow.editRow    plugins.form.EditRow.editRow(rowWidget, node)");
	////console.log("EditRow.editRow    rowWidget: " + rowWidget);	
	////console.log("EditRow.editRow    this.editingRow: " + this.editingRow);

	// RETURN IF ALREADY EDITING PARAMETER ROW (I.E., MULTIPLE CLICKS)
	if ( this.editingRow == true ) return;

	// RETURN IF THIS IS A DOUBLE-CLICK
	this.originalText = node.innerHTML;
	if ( this.originalText == null || ! this.originalText ) this.originalText = '';
	if ( this.originalText.match(/^<i/) ||
		this.originalText.match(/^<br/) ||
		this.originalText.match(/^<fieldset/) ||
		this.originalText.match(/^<textarea/) )		return;

	// SET this VARIABLES
	this.rowWidget= rowWidget;
	this.node = node;
	
	this.editingRow = true;
	this.disableDrag();
	
	node.innerHTML = '';
	this.originalText = this.convertString(this.originalText, "htmlToText");
	this.textarea.value = this.originalText;
	////console.log("EditRow.editRow    Inserted into this.textarea this.originalText: " + dojo.toJson(this.originalText));
	////console.log("EditRow.editRow    New this.textarea.value: " + dojo.toJson(this.textarea.value));
	node.appendChild(this.textarea);
	dojo.attr(this.textarea, 'style', 'visibility: visible');
	this.textarea.focus();
},

handleOnKeyPress: function (event) {
	//////console.log("EditRow.handleOnKeyPress    plugins.form.EditRow.handleOnKeyPress(event)");
	//////console.log("EditRow.handleOnKeyPress    event: " + event);
	
	// summary: handles keyboard events
	var key = event.charOrCode;
	if ( key == null )	return;
	
	event.stopPropagation();
	//////console.log("EditRow.handleOnKeyPress    this.textarea.onkeypress	key: " + key);
	
	if ( key == dojo.keys.ESCAPE )	this.handleEscape();
	if ( key != 13 )	return;

	try {

		// GET NEW VALUE OF INPUT
		this.freshValue = this.convertAngleBrackets(this.textarea.value, "htmlToText");
		//this.freshValue = this.convertBackslash(this.freshValue, "textToHtml");
		////console.log("EditRow.handleOnKeyPress    this.freshValue: " + dojo.toJson(this.freshValue));

		// REMOVE TEXTAREA
		////console.log("EditRow.handleOnKeyPress    REMOVING TEXTAREA NODE");
		this.node.removeChild(this.textarea);
		this.node.focus();

		// SET NEW VALUE OF INPUT
		this.node.innerHTML = this.freshValue;
		////console.log("EditRow.handleOnKeyPress    Set this.node.innerHTML = this.freshValue: " + dojo.toJson(this.freshValue));

		// NOT EDITING ROW ANY MORE
		this.editingRow = false;

		// IF NEW INPUT VALUE IS INVALID, ADD 'invalid' CSS CLASS 
		// AND RESTORE ORIGINAL VALUE OF INPUT
		var key = this.node.getAttribute('class').match(/^(\S+)/)[1];
		var value = this.convertString(this.freshValue, "htmlToText");
		value = this.convertBackslash(value, "expand");
		if ( (this.isValidInput(key, value) == false
				&& this.requiredInputs[key] != null) )
		{
			////console.log("EditRow.handleOnKeyPress    invalid input '" + key + "': " + dojo.toJson(value));
			dojo.addClass(this.node, 'invalid');
			this.node.innerHTML = this.freshValue;
			this.enableDrag();
			this.textarea.blur();
		}

		// IF THERE'S NO CHANGE, RESTORE ORIGINAL VALUE OF INPUT
		else if ( this.originalText == this.freshValue ) {
			////console.log("EditRow.handleOnKeyPress    this.originalText == this.freshValue: " + dojo.toJson(this.originalText) + "==" + dojo.toJson(this.freshValue));
			this.node.innerHTML = this.freshValue;
			////console.log("EditRow.handleOnKeyPress    this.node.innerHTML: " + dojo.toJson(this.node.innerHTML));
			this.enableDrag();
			this.textarea.blur();
		}

		// OTHERWISE, SAVE THE PARAMETER AND RELOAD THE DRAG SOURCE
		else
		{
			////console.log("EditRow.handleOnKeyPress    VALID input '" + key + "': " + dojo.toJson(value));
			dojo.removeClass(this.node, 'invalid');
			this.enableDrag();

			// SAVE PARAMETER
			////console.log("EditRow.handleOnKeyPress    Doing this.saveInputs(inputs, {reload: false, originator: this})");				
			var inputs = this.getFormInputs(this.rowWidget);
			if ( inputs == null ){
				this.textarea.blur();
				return;
			}
			this.saveInputs(inputs, {reload: false, originator: this});
			this.textarea.blur();
		}
	
	
	}
	catch (error) {
		////console.log("EditRow.handleOnKeyPress    ERROR: " + error);
		this.editingRow = false;
	}

	this.enableDrag();
},

handleEscape : function () {
	
	////console.log("EditRow.handleOnKeyPress    Doing ESCAPE");
	this.editingRow = false;
	this.enableDrag();

	// REMOVE TEXTAREA
	this.textarea.blur();
	this.node.removeChild(this.textarea);

	// RESTORE ORIGINAL VALUE
	this.node.innerHTML = this.originalText;
},

handleOnBlur: function (event) {
// QUIT EDIT IF FOCUS IS LOST
	////console.log("EditRow.handleOnBlur    rowWidget.onBlur(event)");
	////console.log("EditRow.handleOnBlur    //console.dir(event)");
	//console.dir({event: event});
	////console.log("EditRow.handleOnBlur    this.editingRow: " + this.editingRow);

	if ( this.editingRow == false )	return;		

	// REMOVE TEXTAREA
	////console.log("EditRow.handleOnBlur    this.textarea: " + this.textarea);
	var parentNode;
	if ( this.textarea != null )
		parentNode = this.textarea.parentNode;
	////console.log("EditRow.handleOnBlur    parentNode: " + parentNode);

	try {
		if ( parentNode != null && this.textarea != null )
		{
			this.textarea.blur();
			parentNode.removeChild(this.textarea);
		}
		// RESTORE ORIGINAL VALUE
		////console.log("EditRow.handleOnBlur    rowWidget.onBlur    Doing node.innerHTML = " + this.originalText);
		parentNode.innerHTML = this.originalText;
	}
	catch (error) {
		//console.warn("EditRow.handleOnBlur    rowWidget.onBlur    onBlur ERROR");
	}

	this.editingRow = false;
	this.enableDrag();
},


disableDrag : function () {
////console.log("EditRow.disableDrag    form.EditRow.disableDrag()");
	if ( this.dragSourceWidget == null )	return;
		this.dragSourceWidget.isSource = false;
},

enableDrag : function () {
////console.log("EditRow.enableDrag    form.EditRow.enableDrag()");
	if ( this.dragSourceWidget == null )	return;
		this.dragSourceWidget.isSource = true;
}




}); // plugins.form.EditRow

