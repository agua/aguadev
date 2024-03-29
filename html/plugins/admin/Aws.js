dojo.provide("plugins.admin.Aws");

// ALLOW THE ADMIN USER TO ADD, REMOVE AND MODIFY USERS

// NEW USERS MUST HAVE username AND email

//dojo.require("dijit.dijit"); // optimize: load dijit layer
dojo.require("dijit.form.Button");
//dojo.require("dijit.form.TextBox");
//dojo.require("dijit.form.NumberTextBox");
//dojo.require("dijit.form.Textarea");
dojo.require("dojo.parser");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("plugins.core.Common");

dojo.declare("plugins.admin.Aws",
	[ dijit._Widget, dijit._Templated, plugins.core.Common ], {

//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "admin/templates/aws.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

//addingUser STATE
addingUser : false,

// OR USE @import IN HTML TEMPLATE
cssFiles : [
	dojo.moduleUrl("plugins", "admin/css/aws.css"),
	//dojo.moduleUrl("dojo", "/tests/dnd/dndDefault.css")
],

requiredInputs : {
	amazonuserid 		: 1,
	awsaccesskeyid 		: 1,
	awssecretaccesskey 	: 1,
	ec2privatekey 		: 1,
	ec2publiccert 		: 1
},

// PARENT WIDGET
parentWidget : null,

/////}}}

constructor : function(args)  {
	// GET INFO FROM ARGS
	this.parentWidget = args.parentWidget;
	this.core = args.parentWidget.core;

	// LOAD CSS
	this.loadCSS();
},
postCreate : function() {
	this.startup();
},
startup : function () {
	//console.log("Aws.startup    plugins.admin.GroupAws.startup()");

	// COMPLETE CONSTRUCTION OF OBJECT
	this.inherited(arguments);

	// ADD ADMIN TAB TO TAB CONTAINER		
	this.tabContainer.addChild(this.mainTab);
	this.tabContainer.selectChild(this.mainTab);

	// SET DRAG SOURCE - LIST OF USERS
	this.initialiseAws();
},
// SAVE TO REMOTE
addAws : function (event) {

console.clear();

	console.log("Aws.addAws    plugins.admin.Aws.addAws(event)");
	console.log("Aws.addAws    event: " + event);
	
	if ( this.savingAws == true ) {
		console.log("Aws.addAws    this.savingAws: " + this.savingAws + ". Returning.");
		return;
	}
	this.savingAws = true;
	
	// VALIDATE INPUTS
	var inputs = this.validateInputs();
	if ( ! inputs ) {
		this.savingAws = false;
		return;
	}
	
	var query = inputs;
	query.username 			= Agua.cookie('username');
	query.sessionId 		= Agua.cookie('sessionId');
	query.repotype			= "github";
	query.mode = "addAws";
	
	console.log("Aws.addAws    query: ");
	console.dir({query:query});

	var url = Agua.cgiUrl + "workflow.cgi?";
	
	// SEND TO SERVER
	var thisObj = this;
	dojo.xhrPut(
		{
			url: url,
			contentType: "json",
			putData: dojo.toJson(query),
			handleAs: "json",
			load: function(response, ioArgs) {
				console.log("Aws.addAws    STATUS response:");
				console.dir({response:response});

				if ( ! response ) {
					Agua.toast({error:"No response from server on 'addAws'"});
					return;
				}
				
				if ( ! response.error ) {
					console.log("Aws.addAWS    DOING Agua.setAws(inputs)");
					Agua.setAws(inputs);
				}


				Agua.toast(response);
				
			},
			error: function(response, ioArgs) {
				console.log("Aws.addAws    ERROR response:");
				console.dir({response:response});
				Agua.toast(response);
			}
		}
	);

	this.savingAws = false;
},
validateInputs : function () {
	var inputs = new Object;
	this.isValid = true;
	for ( var input in this.requiredInputs ) {
		inputs[input] = this.verifyInput(input);
	}
	console.log("Aws.validateInputs    inputs: ");
	console.dir({inputs:inputs});

	if ( ! this.isValid ) 	return null;	
	return inputs;
},
verifyInput : function (input) {
	console.log("Aws.verifyInput    input: ");
	console.dir({this_input:this[input]});
	var value = this[input].value;
	value = this.cleanEdges(value);
	console.log("Aws.verifyInput    value: " + value);

	var className = this.getClassName(this[input]);
	console.log("Aws.verifyInput    className: " + className);
	if ( className ) {
		console.log("Aws.verifyInput    this[input].isValid(): " + this[input].isValid());
		if ( ! value || ! this[input].isValid() ) {
			console.log("Aws.verifyInput    input " + input + " value is empty. Adding class 'invalid'");
			dojo.addClass(this[input].domNode, 'invalid');
			this.isValid = false;
		}
		else {
			console.log("Aws.verifyInput    value is NOT empty. Removing class 'invalid'");
			dojo.removeClass(this[input].domNode, 'invalid');
			return value;
		}
	}
	else {
		if ( ! value ) {
			console.log("Aws.verifyInput    input " + input + " value is EMPTY. Adding class 'invalid'");
			dojo.addClass(this[input], 'invalid');
			this.isValid = false;
			return null;
		}
		else if ( input == "ec2privatekey" ) {
			if ( ! value.match(/^\s*-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----\S*$/) ) {
				console.log("Aws.verifyInput    value is INVALID. Adding class 'invalid'");
				dojo.addClass(this[input], 'invalid');
				this.isValid = false;
				return null;
			}
			
				console.log("Aws.verifyInput    value is VALID. Removing class 'invalid'");
			dojo.removeClass(this[input], 'invalid');
			return value;
		}
		else if ( input == "ec2publiccert" ) {
			if ( ! value.match(/^\s*-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\S*$/) ) {
				console.log("Aws.verifyInput    value is INVALID. Adding class 'invalid'");
				dojo.addClass(this[input], 'invalid');
				this.isValid = false;
				return null;
			}
			
				console.log("Aws.verifyInput    value is VALID. Removing class 'invalid'");
			dojo.removeClass(this[input], 'invalid');
			return value;
		}
	}
	
	return null;
},
initialiseAws : function () {
	// INITIALISE AWS SETTINGS
	var aws = Agua.getAws();
	console.log("Aws.initialiseAws     aws: ");
	console.dir({aws:aws});

	this.amazonuserid.set('value', aws.amazonuserid);
	this.awsaccesskeyid.set('value', aws.awsaccesskeyid);
	this.awssecretaccesskey.set('value', aws.awssecretaccesskey);
	this.ec2privatekey.value = aws.ec2privatekey || "";
	this.ec2publiccert.value = aws.ec2publiccert || "";
},
cleanEdges : function (string ) {
// REMOVE WHITESPACE FROM EDGES OF TEXT
	string = string.toString();
	if ( string == null || ! string.replace)
		return null;
	string = string.replace(/^\s+/, '');
	string = string.replace(/\s+$/, '');

	return string;
}
}); // plugins.admin.Aws

