jQuery.sap.require("jm.scanner.util.Formatter");
jQuery.sap.require("jm.scanner.util.Controller");

jm.scanner.util.Controller.extend("jm.scanner.controller.Master", {

	onInit : function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		this.getView().byId("list").attachEventOnce("updateFinished", function() {
			this.oInitialLoadFinishedDeferred.resolve();
			oEventBus.publish("Master", "InitialLoadFinished", { oListItem : this.getView().byId("list").getItems()[0] });
		}, this);

		var oEventBus = this.getEventBus();
		oEventBus.subscribe("Detail", "TabChanged", this.onDetailTabChanged, this);

		//on phones, we will not have to select anything in the list so we don't need to attach to events
		if (sap.ui.Device.system.phone) {
			return;
		}

		this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);

		oEventBus.subscribe("Detail", "Changed", this.onDetailChanged, this);
		oEventBus.subscribe("Detail", "NotFound", this.onNotFound, this);
	},

	onRouteMatched : function(oEvent) {
		var sName = oEvent.getParameter("name");

		if (sName !== "main") {
			return;
		}

		//Load the detail view in desktop
		this.getRouter().myNavToWithoutHash({
			currentView : this.getView(),
			targetViewName : "jm.scanner.view.Detail",
			targetViewType : "XML"
		});

		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {

			//On the empty hash select the first item
			this.selectFirstItem();

		});

	},

	onDetailChanged : function (sChanel, sEvent, oData) {
		var sProductPath = oData.sProductPath;
		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {
			var oList = this.getView().byId("list");

			var oSelectedItem = oList.getSelectedItem();
			// the correct item is already selected
			if(oSelectedItem && oSelectedItem.getBindingContext().getPath() === sProductPath) {
				return;
			}

			var aItems = oList.getItems();

			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].getBindingContext().getPath() === sProductPath) {
					oList.setSelectedItem(aItems[i], true);
					break;
				}
			}
		});
	},

	onDetailTabChanged : function (sChanel, sEvent, oData) {
		this.sTab = oData.sTabKey;
	},

	waitForInitialListLoading : function (fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound : function () {
		this.getView().byId("list").removeSelections();
	},

	selectFirstItem : function() {
		var oList = this.getView().byId("list");
		var aItems = oList.getItems();
		if (aItems.length) {
			oList.setSelectedItem(aItems[0], true);
		}
	},

	onSearch : function() {
		// add filter for search
		var filters = [];
		var searchString = this.getView().byId("searchField").getValue();
		if (searchString && searchString.length > 0) {
			filters = [ new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, searchString) ];
		}

		// update list binding
		this.getView().byId("list").getBinding("items").filter(filters);
	},

	onSelect : function(oEvent) {
		// Get the list item, either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode).
		var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
		this.showDetail(oItem.getBindingContext().getPath().substr(1));
	},

	showDetail : function(sPath) {
		// If we're on a phone, include nav in history; if not, don't.
		var bReplace = jQuery.device.is.phone ? false : true;
		this.getRouter().navTo("product", {
			from: "master",
			product: sPath,
			tab: this.sTab || "supplier"
		}, bReplace);
	},

	onAddProduct : function() {
		this.getRouter().myNavToWithoutHash({
			currentView : this.getView(),
			targetViewName : "jm.scanner.view.AddProduct",
			targetViewType : "XML",
			transition : "slide"
		});
	},

	onBarcodePress : function(oEvent) {
		var scanner = cordova.require("cordova/plugin/BarcodeScanner");

		scanner.scan($.proxy(this.onBarcodeSuccess, this), $.proxy(this.onBarcodeError, this));
	},

	onBarcodeSuccess: function(result){
		var oView = this.getView();
		var oList = oView.byId("list");
		var oSelected = oList.getSelectedItem();
		if (oSelected) {
			oList.setSelectedItemById(oSelected.getId(), false);
		}

		this.showDetail(result.text);

		console.log("Scanner result: \n" +
			"text: " + result.text + "\n" +
			"format: " + result.format + "\n" +
			"cancelled: " + result.cancelled + "\n");
	},

	onBarcodeError: function(error) {
		console.log("Scanning failed: ", error);
	}

});