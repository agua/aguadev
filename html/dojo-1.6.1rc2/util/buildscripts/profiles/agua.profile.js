dependencies = {
    layers:  [
        {
	        name: "../agua.js",
            dependencies: [
				"plugins.login.LoginStatus",
				"plugins.login.Controller",
				"plugins.login.Login",
				"plugins.core.Common",
				"plugins.admin.Controller",
				"plugins.workflow.Controller",
				"plugins.project.Controller",
				"plugins.report.Controller",
				"plugins.help.Controller",
				"dojox.widget.Dialog",
				"dijit.form.Button",
				"dijit.form.TextBox",
				"dojo.fx.easing",
				"dojox.timing.Sequence",
				"plugins.project.SharedProjectFiles",
				"plugins.project.ProjectFiles",
				"plugins.files.FileDrag",
				"dojox.data.FileStore",
				"dojo.dnd.Source",
				"dojo.dnd.Moveable",
				"dojo.dnd.Mover",
				"dojo.dnd.move",
				"dijit.Tooltip",
				"plugins.core.BorderContainer",
				"plugins.core.ExpandoPane",
				"plugins.files.FileMenu",
				"plugins.files.FolderMenu",
				"plugins.files.WorkflowMenu",
				"plugins.files.TitlePane",
				"dijit.layout.LayoutContainer",
				"plugins.project.SharedSourceFiles",
				"plugins.project.Project",
				"plugins.files._FileInfoPane",
				"dijit.TitlePane",
				"plugins.project.FileInput",
				"plugins.project.FileInputAuto",
				"plugins.project.SourceFiles",
				"dijit.layout.ContentPane",
				"plugins.view.Chromosomes",
				"dojox.widget.FisheyeLite",
				"dojo.data.ItemFileReadStore",
				"dijit.form.ComboBox",
				"plugins.report.Editor",
				"plugins.form.UploadDialog",
				"dojox.layout.ResizeHandle",
				"dijit.Editor",
				"dijit.form.DateTextBox",
				"dijit.form.Textarea",
				"dijit.form.ValidationTextBox",
				"dijit.form.NumberTextBox",
				"dijit.form.CurrencyTextBox",
				"dojo.currency",
				"dijit.Dialog",
				"plugins.workflow.FileManager",
				"plugins.workflow.FileSelector",
				"dijit.Tree",
				"dijit.layout.AccordionContainer",
				"dijit.layout.TabContainer",
				"dijit.layout.BorderContainer",
				"dojox.layout.FloatingPane",
				"dojox.rpc.Service",
				"dojo.io.script",
				"dojox.layout.ExpandoPane",
				"dijit.layout.SplitContainer",
				"dojo.parser",
				"plugins.view.jbrowse.jslib.dojo.jbrowse_dojo",
				"plugins.view.jbrowse.js.Browser",
				"plugins.view.jbrowse.js.Util",
				"plugins.view.jbrowse.js.NCList",
				"plugins.view.jbrowse.js.Layout",
				"plugins.view.jbrowse.js.LazyArray",
				"plugins.view.jbrowse.js.LazyPatricia",
				"plugins.view.jbrowse.js.Track",
				"plugins.view.jbrowse.js.SequenceTrack",
				"plugins.view.jbrowse.js.FeatureTrack",
				"plugins.view.jbrowse.js.UITracks",
				"plugins.view.jbrowse.js.ImageTrack",
				"plugins.view.jbrowse.js.GenomeView",
				"plugins.view.jbrowse.js.touchJBrowse",
				"plugins.view.jbrowse.species.human.hg19.data.refSeqs",
				"plugins.view.jbrowse.species.human.hg19.data.trackInfo",
				"dijit._base.place",
				"plugins.view.Controller",
				"plugins.view.View",
				"plugins.core.SelectiveDialog",
				"plugins.help.Help",
				"plugins.core.DropTarget",
				"dojo.cookie",
				"plugins.core.InteractiveDialog",
				"plugins.core.InputDialog",
				"plugins.core.Updater",
				"plugins.core.PluginManager",
				"plugins.core.Plugin",
				"plugins.core.ComboBox",
				"plugins.core.BorderContainerStatic",
				"plugins.core.Controls",
				"dijit.Toolbar",
				"dojox.widget.Toaster",
				"dojox.widget.Standby",
				"plugins.core.Data",
				"plugins.report.SNP",
				"dijit.dijit",
				"dijit.form.CheckBox",
				"dijit.form.RadioButton",
				"dijit.form.Slider",
				"dijit.form.FilteringSelect",
				"dijit.form.NumberSpinner",
				"plugins.upload.FileUp",
				"dijit.Menu",
				"dijit.ColorPalette",
				"plugins.files.FileSelector",
				"plugins.report.Grid",
				"plugins.report.Report",
				"plugins.core.WidgetFramework",
				"plugins.report.Common",
				"dojo.data.ItemFileWriteStore",
				"dojox.grid.DataGrid",
				"plugins.admin.Projects",
				"plugins.form.EditForm",
				"plugins.admin.ProjectRow",
				"plugins.admin.Settings",
				"plugins.admin.UserRow",
				"plugins.admin.Apps",
				"plugins.admin.AppRow",
				"plugins.admin.Sources",
				"plugins.admin.SourceRow",
				"plugins.admin.ConfirmDialogue",
				"plugins.admin.GroupUsers",
				"plugins.admin.GroupUserRow",
				"plugins.admin.Access",
				"plugins.form.ValidationTextarea",
				"plugins.admin.AccessRow",
				"plugins.admin.Parameters",
				"plugins.admin.ParameterRow",
				"plugins.admin.GroupProjects",
				"plugins.admin.GroupProjectRow",
				"plugins.admin.Admin",
				"plugins.admin.Clusters",
				"plugins.admin.Parameter",
				"plugins.admin.Groups",
				"plugins.admin.GroupSources",
				"plugins.admin.Users",
				"plugins.admin.GroupSourceRow",
				"plugins.admin.GroupRow",
				"plugins.admin.ClusterRow",
				"plugins.form.DndTrash",
				"plugins.form.DndSource",
				"plugins.form.TextArea",
				"plugins.form.Inputs",
				"plugins.form.EditRow",
				"dojox.form.Uploader",
				"dojox.form.uploader.FileList",
				"dojox.form.uploader.plugins.Flash",
				"plugins.form.Dnd",
				"plugins.dnd.Source",
				"plugins.dnd.Avatar",
				"dijit.form.SimpleTextarea",
				"plugins.menu.Menu",
				"plugins.core.ConfirmDialog",
				"dojox.form.FileInputAuto",
				"plugins.files.Dialog",
				"Agua.cookie",
				"dojox.widget.RollingList",
				"plugins.files._GroupSelectorPane",
				"dojo.i18n",
				"plugins.files._GroupDragPane",
				"plugins.files.FileUpload",
				"dojox.form.FileInput",
				"dojox.form.FileUploader",
				"dojox.layout.ContentPane",
				"plugins.files.SelectorMenu",
				"dijit.InlineEditBox",
				"dojo._base.fx",
				"dojo._base.html",
				"plugins.files.WorkflowSelectorMenu",
				"plugins.files.FileManager",
				"dojox.widget.FileInput",
				"dojox.widget.FileInputAuto",
				"plugins.files.FileSelectorMenu",
				"plugins.dnd.Target",
				"dojo.dnd.Selector",
				"plugins.dnd.Manager",
				"dojo.dnd.common",
				"dojo.dnd.autoscroll",
				"dojo.dnd.Avatar",
				"plugins.data.FileStore",
				"plugins.data.Controller",
				"plugins.data.Data",
				"plugins.workflow.Workflow",
				"doj",
				"dojox.timing",
				"plugins.workflow.Parameters",
				"plugins.workflow.FileManagerPane",
				"plugins.workflow.Apps",
				"plugins.workflow.AppSource",
				"plugins.workflow.AppRow",
				"plugins.workflow.AppsMenu",
				"plugins.workflow.RunStatus",
				"plugins.workflow.SharedProjects",
				"plugins.workflow.Stages",
				"plugins.workflow.Status",
				"plugins.workflow.ParameterRow",
				"plugins.workflow.SharedApps",
				"plugins.workflow.HistoryPane",
				"plugins.workflow.StageRow",
				"plugins.workflow.StagesMenu",
				"plugins.workflow.IO",
				"plugins.core.Confirm",
				"plugins.project.FileDrag",
				"plugins.project._GroupDragPane",
				"plugins.workflow.History"

            ]
        }
    ],

    prefixes: [
        [ "dijit", "../dijit" ],
        [ "dojox", "../dojox" ],
        [ "plugins", "../../plugins" ]
    ]
};