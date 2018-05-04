function assignInspectorfromASI(inspNum, user){
	newInspector = (""+user).split(" ")
	newID = ""
	if (newInspector.length >= 2) {
		fname = ""+newInspector.slice(0,newInspector.length -1).join(" ")
		lname = ""+newInspector.slice(-1)
	
		var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext", null).getOutput();
		var ds = initialContext.lookup("java:/AA");
		var conn = ds.getConnection();
		try{
			var SQL = "SELECT USER_NAME, INSPECTOR_STATUS FROM PUSER WHERE SERV_PROV_CODE = 'NEWMEX' AND UPPER(FNAME) = ? AND UPPER(LNAME) = ?"
			var dbStmt = conn.prepareStatement(SQL);
			dbStmt.setString(1,fname.toUpperCase())
			dbStmt.setString(2,lname.toUpperCase())
			dbStmt.executeQuery();
			results = dbStmt.getResultSet()
			
			if (results.next()) {
				/*if (results.getString("INSPECTOR_STATUS") != "Y") {
					showMessage = true;
					logMessage("Could not auto-assign inspection to '" + user + "' because they are not configured as an Inspector in Accela Automation. Please assign inspection manually.")
					conn.close()
					return
				}*/
				newID = results.getString("USER_NAME")
			}
			dbStmt.close();
		}
		catch(err) {
			logDebug(err.message); 
			if (typeof dbStmt != "undefined") dbStmt.close();
		}
		conn.close()
	}
	if (newID != "") assignInspection(inspNum, newID)
	else {
		showMessage = true;
		logMessage("Could not auto-assign inspection to '" + user + "'. Please assign inspection manually.")
	}
}


function feeTotalByStatus(feeStatus) {
	var statusArray = new Array(); 
	if (arguments.length > 0) {
		for (var i=0; i<arguments.length; i++)
			statusArray.push(arguments[i]);
	}
        
	var feeTotal = 0;
	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess()) { 
		var feeObjArr = feeResult.getOutput(); 
		for (ff in feeObjArr) {
                        feeStatus = "" + feeObjArr[ff].getFeeitemStatus();
			if (exists(feeStatus,statusArray)) 
				feeTotal+=feeObjArr[ff].getFee();
                        
		}

	}
	else { 
		logDebug( "Error getting fee items: " + feeResult.getErrorMessage()); 
	}
	return feeTotal;
}
 


function removeZeroFees() {
	var feeArr = loadFees();
	for (x in feeArr) {
		thisFee = feeArr[x];
		if (matches(thisFee.status,"NEW","INVOICED") && thisFee.amount == 0) { // 6/16/2016 "INVOICED" originally said "INVOIcED". Fabio Mir
			voidRemoveFees(thisFee.code);
		}
	}
}


function updateAllFees(ignoreArray, fsched) {
	feeSchedArr = loadFeeSchedule(fsched);
	for (fIndex in feeSchedArr) {
		thisFeeDef = feeSchedArr[fIndex];
		aa.print(thisFeeDef.feeCode);
		if (!IsStrInArry(thisFeeDef.feeCode, ignoreArray)) {
			updateFee(thisFeeDef.feeCode, fsched, "FINAL", 1, "N");
		}
	}
}

function IsStrInArry(eVal,argArr) {
   	for (x in argArr){
   		if (eVal == argArr[x]){
   			return true;
   		}
 	  }	
	return false;
}

function loadFeeSchedule(fsched) {
	// loads a fee schedule into an array

	var fArr = new Array();
	var arrFeesResult = aa.finance.getFeeItemList(null,fsched,null);
	if (arrFeesResult.getSuccess()) {
		var arrFees = arrFeesResult.getOutput();
		for (xx in arrFees) {
			var f = new FeeDef();
			f.feeCode = arrFees[xx].getFeeCod();
			f.feeDesc = arrFees[xx].getFeeDes();
			f.formula = arrFees[xx].getFormula();
			f.feeUnit = arrFees[xx].getFeeunit();
			var rft = arrFees[xx].getrFreeItem();
			f.comments = rft.getComments();
			fArr.push(f);
		} // for xx
	}
	else { 
		logDebug("Error getting fee schedule " + arrFeesResult.getErrorMessage());
		return null;
	}
	return fArr;
}

function FeeDef () { // Fee Definition object 
	this.formula = null;
	this.feeUnit = null;
	this.feeDesc = null;
	this.feeCode = null;
	this.comments = null;
        this.calcProc = null;
}

function checkFeesPermitIssuance(wTask, wStatus) {
	if (balanceDue > 0 || feeTotalByStatus("NEW") > 0) {
		logDebug("Fees Due on: " + wTask + ", " + wStatus)
		if (appMatch("Permits/Commercial/*/*") || appMatch("Permits/Residential/*/*") || appMatch("Permits/Manufactured Housing/*/*")) {
			if ( wTask == "Permit Issuance" && (wStatus == "Issue" || wStatus == "Issued") ){
				showMessage = true
				logMessage("Permit cannot be Issued until Permit Fees are paid.")
			}
		}
		else if (appMatch("Permits/Modular/Decal/NA")) {
			if ( wTask == "Application Submittal" && wStatus.substr(0, 8) == "Accepted" ){
				showMessage = true
				logMessage("Modular Permits cannot be Issued until Permit Fees are paid.")
			}
		}
		else if (appMatch("Permits/LP Gas/Cargo Tank/NA")) {
			if ( wTask == "Application Submittal" && wStatus == "Accepted - Plan Review Not Req" ){
				showMessage = true
				logMessage("LP Gas Permits cannot be Issued until Permit Fees are paid.")
			}
			else if ( wTask == "LP Gas Plan Review" && matches(wStatus,"Approved","Approved w/Comments") ){
				showMessage = true
				logMessage("LP Gas Permits cannot be Issued until Permit Fees are paid.")
			}
		}
		else if (appMatch("Permits/LP Gas/Special Events/NA")) {
			if ( wTask == "Application Submittal" && wStatus == "Accepted" ){
				showMessage = true
				logMessage("LP Gas Permits cannot be Issued until Permit Fees are paid.")
			}
		}
		else if (appMatch("Permits/LP Gas/*/NA")) {
			if ( wTask == "LP Gas Plan Review" && matches(wStatus, "Approved", "Approved w/Comments", "Not Required")){
				showMessage = true
				logMessage("LP Gas Permits cannot be Issued until Permit Fees are paid.")
			}
			else if ( wTask == "Application Submittal" && matches(wStatus, "Accepted - Plan Review Not Req")){
				showMessage = true
				logMessage("LP Gas Permits cannot be Issued until Permit Fees are paid.")
			}
		}
	}
}

function populateInspectorASIfromCityAndZip() {
	jsonScript = "CITY-ZIP TO INSPECTOR"
	thisZip = ""
	thisCity = ""
	inspectorGroup = ""
	if (appTypeArray[1].equals("Commercial") || appTypeArray[1].equals("Residential")) {
		if(appTypeArray[2].equals("Building")) inspectorGroup = "GENERAL"
		else if(appTypeArray[2].equals("Mechanical")) inspectorGroup = "MECHANICAL"
		else if (appTypeArray[2].equals("Electrical")) inspectorGroup = "ELECTRICAL"
	}
	else if (appTypeArray[1].equals("Manufactured Housing")) { inspectorGroup = "MHD"}
	
	//No Auto-Assign rules specified
	if (inspectorGroup == "") return

	inspectorJSON = ""+getScriptText(jsonScript).toUpperCase()
	inspectorLogic = JSON.parse(inspectorJSON)
	
	var capAddressResult = aa.address.getAddressByCapId(capId);
	if (capAddressResult.getSuccess()) {
		Address = capAddressResult.getOutput();
		for (a in Address) {
			if ("Y"==Address[a].getPrimaryFlag()) {
				thisZip = ""+Address[a].getZip()
				thisCity = ""+Address[a].getCity()
			}
		}
	}
	inspDist = thisCity.toUpperCase()+"-"+thisZip.substr(0,5)
	logDebug(inspDist)
	
	if ( matches(thisZip, "", "null", "undefined") || matches(thisCity, "", "null", "undefined") || typeof inspectorLogic[inspDist] != "object") {
		showMessage = true;
		logMessage("Could not find configured inspector for the city: " + thisCity + ", and zip code: "+ thisZip + ". Please manually assign inspector.")
		return
	}
	
	if (typeof inspectorLogic[inspDist][inspectorGroup] != "string"){
		logDebug("***Error: Could find inspector name for inspection group '"+inspectorGroup+"' in configuration, check script file: '" + jsonScript + "'.")
		return
	}
	try {
		logDebug(inspDist + ": Gen: "+ inspectorLogic[inspDist]["GENERAL"] + " | Mech: " + inspectorLogic[inspDist]["MECHANICAL"] + " | Ele: " + inspectorLogic[inspDist]["ELECTRICAL"] + " | MHD: " + inspectorLogic[inspDist]["MHD"])
	} catch (err) {logDebug(err)}
	editAppSpecific("Inspector", inspectorLogic[inspDist][inspectorGroup])
}
	
function intersect(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; 
    return a.filter(function (e) {
        if (b.indexOf(e) !== -1) return true;
    });
}

function validateResElectricalLicType() {
	//DEFINE REQUIRED LICENSES PER ASI FIELD
	var popASI = []
	var reqLic = {
		"Less than 100 AMP Service/Panel": 				["EE-98","ER-01"],
		"101-200 AMP Service/Panel": 					["EE-98","ER-01"],
		"200-320 AMP Service/Panel": 					["EE-98","ER-01"],
		"321-400 AMP Service/Panel": 					["EE-98"],
		"Over 400 AMP Service":					 		["EE-98"],
		"Temporary Power Pole": 						["EE-98","ER-01"],
		"Services Change Only, No Outlets": 			["EE-98","ER-01"],
		"Minimum Inspection Fee for items Not Listed": 	["EE-98","ER-01","ES-03","ES-07","ES-10R","ES-10"],
		"Telephone /Data Wiring": 						["EE-98","ER-01","ES-03","ES-07"],
		"Fire Alarm Wiring": 							["EE-98","ER-01","ES-03"],
		"CATV Wiring": 									["EE-98","ER-01","ES-03","ES-07"],
		"Audio Wiring": 								["EE-98","ER-01","ES-03"]
	}
	
	//GET ASI FIELD THAT IS POPULATED
	for (i in AppSpecificInfoModels) {
		if (""+AppSpecificInfoModels[i].getCheckboxType() == "ELECTRICAL RESIDENTIAL ITEMS" && !matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checkboxDesc)
		}
	}
	
	if ( popASI.length == 0 ) {
		logDebug("None of the ASI fields used for Licence Professional validation were populated.")
		return 1
	}
	logDebug(popASI)
	reqLicTypes = []
	for ( i in popASI){
	logDebug(popASI[i]+": "+reqLic[popASI[i]])
		if (typeof reqLic[popASI[i]] == 'object') {
			if (reqLicTypes.length == 0) { reqLicTypes = reqLic[popASI[i]] }
			else { reqLicTypes = intersect(reqLicTypes, reqLic[popASI[i]]) }
		}
	}
	if(reqLicTypes.length == 0){
		logDebug("No Licence Professional restrictions for the work: " + popASI)
		return 2
	}
	
	logDebug(reqLicTypes)

	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in reqLicTypes) {
			if (reqLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + reqLicTypes[type])
				return 3
			}
		}			
	}
	
	cancel = true
	showMessage = true
	logMessage("License type "+reqLicTypes.join(" or ") + " is required for work being performed.")
	//showMessage = false
}

function validateComElectricalLicType() {
	//DEFINE REQUIRED LICENSES PER ASI FIELD
	var popASI = []
	var reqLic = {
		"0-100 AMP Service/Panel": 						["EE-98","EL-01","ES-10R","ES-10"],
		"101-200 AMP Service/Panel": 					["EE-98","EL-01","ES-10R","ES-10"],
		"201-400 AMP Service/Panel": 					["EE-98","EL-01"],
		"401-600 AMP Service/Panel": 					["EE-98","EL-01"],
		"601-800 Amp Service/Panel": 					["EE-98"],
		"801-1000 AMP Service/Panel": 					["EE-98","EL-01"],
		"1000 - 2000 AMP Service/Panel": 				["EE-98","EL-01"],
		"Over 2000 AMP Service/Panel": 					["EE-98","EL-01"],
		"Temporary Power Pole": 						["EE-98","EL-01"],
		"Minimum Inspection Fee for items Not Listed":	["EE-98","EL-01","ES-01","ES-02","ES-03","ES-07","ES-10R","ES-10","GF-09"],
		"Telephone/Data Wiring": 						["EE-98","ES-07"],
		"Fire Alarm Wiring": 							["EE-98","ES-02","ES-03"],
		"CATV Wiring": 									["EE-98","ES-02","ES-03"],
		"Audio Wiring": 								["EE-98","ES-02","ES-03"],
		"Minimum Fee ($45) plus": 						["EE-98","EL-01"]
	}
	
	//GET ASI FIELD THAT IS POPULATED
	for (i in AppSpecificInfoModels) {
		if (""+AppSpecificInfoModels[i].getCheckboxType() == "ELECTRICAL COMMERCIAL ITEMS" && !matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checkboxDesc)
		}
		else if(""+AppSpecificInfoModels[i].checkboxDesc == "Minimum Fee ($45) plus" && !matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checkboxDesc)
		}
	}
	
	if ( popASI.length == 0 ) {
		logDebug("None of the ASI fields used for Licence Professional validation were populated.")
		return 1
	}
	logDebug(popASI)
	reqLicTypes = []
	for ( i in popASI){
	logDebug(popASI[i]+": "+reqLic[popASI[i]])
		if (typeof reqLic[popASI[i]] == 'object') {
			if (reqLicTypes.length == 0) { reqLicTypes = reqLic[popASI[i]] }
			else { reqLicTypes = intersect(reqLicTypes, reqLic[popASI[i]]) }
		}
	}
	if(reqLicTypes.length == 0){
		logDebug("No Licence Professional restrictions for the work: " + popASI)
		return 2
	}
	
	logDebug(reqLicTypes)
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in reqLicTypes) {
			if (reqLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + reqLicTypes[type])
				return 3
			}
		}			
	}
	
	cancel = true
	showMessage = true
	logMessage("License type "+reqLicTypes.join(" or ") + " is required for work being performed.")
	//showMessage = false
}


function issueLPGasPermitByPayment(asiInspector){
	wTask = "Inspection"
	updateAppStatus("Issued", "Received payment")
	activateTask(wTask)
	deactivateTask("Application Submittal")
	deactivateTask("LP Gas Plan Review")
	dueDate = new Date()
	dueDate.setDate(dueDate.getDate() + 30)
	editTaskDueDate(wTask,jsDateToASIDate(dueDate))
	assignTask(wTask,getUserIdByName(""+asiInspector))
}


function getUserIdByName(user){
	if (typeof user != "string") {return ""}
	newInspector = user.split(" ")
	newID = ""
	if (newInspector.length >= 2) {
		fname = ""+newInspector.slice(0,newInspector.length -1).join(" ")
		lname = ""+newInspector.slice(-1)
	
		var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext", null).getOutput();
		var ds = initialContext.lookup("java:/AA");
		var conn = ds.getConnection();
		try{
			var SQL = "SELECT USER_NAME FROM PUSER WHERE SERV_PROV_CODE = 'NEWMEX' AND UPPER(FNAME) = ? AND UPPER(LNAME) = ?"
			var dbStmt = conn.prepareStatement(SQL);
			dbStmt.setString(1,fname.toUpperCase())
			dbStmt.setString(2,lname.toUpperCase())
			dbStmt.executeQuery();
			results = dbStmt.getResultSet()
			
			if (results.next()) {
				newID = results.getString("USER_NAME")
			}
			dbStmt.close();
		}
		catch(err) {
			logDebug(err.message); 
			if (typeof dbStmt != "undefined") dbStmt.close();
		}
		conn.close()
	}
	return newID
}

function elecPlanCheckReq(phase, kva){
	numKVA = parseFloat("0"+kva)
	// 1/27/2015 added appMatch check to ensure no need for Plan Review for remote installations
	if (appMatch("Permits/Commercial/Electrical/Cell Tower") || appMatch("Permits/Commercial/Electrical/Water Well") || appMatch("Permits/Commercial/Electrical/Oil or Gas Well")) return false
	
	if (matches(""+phase, "Single", "No")) return numKVA > 100
	if (matches(""+phase, "Three", "Yes")) return numKVA > 225
	return false
}

function issuePermitByPayment(currCapStatus){
	ELE_JOBCOST = 400000
	MECH_JOBCOST = 400000
	issDate = new Date()
	expDate = new Date()
	updateIssue = ""
	updateExpir = ""
	updateStatus = ""
	pendInsp = ""
	condition = 0
	
	if (appMatch("Permits/LP Gas/*/*")) return
	
	if (appMatch("Permits/*/Building/NA") && ""+currCapStatus == "Ready to Issue") {
		if ( !feeExists("PERMIT","NEW","INVOICED") ) {
			showMessage = true
			logMessage("Permit Fee is required before this permit can be Issued")
			return false
		}
		condition = 1
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	
	// 1/27/2016 Changed from "Permits/*/Electrical/*" to "Permits/Residential/Electrical/*"
	else if (appMatch("Permits/Residential/Electrical/*")) { 
		kvaASI = getAppSpecific("Job Cost")
		//jCost = parseFloat("0"+getAppSpecific("Job Cost"))
		needsPlanCheck = elecPlanCheckReq(getAppSpecific("Phase"),getAppSpecific("KVA"))
		if (""+currCapStatus == "Submitted" && !needsPlanCheck) {
			condition = 2
			activateTask("Inspection")
			deactivateTask("Permit Issuance")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
			if (parseFloat("0"+getAppSpecific("Temporary Power Pole")) > 0 ){
				createPendingInspection("PMT_ELE_C", "1001 Temporary Power")
			}
		}
		else if (""+currCapStatus == "Ready to Issue" && needsPlanCheck){
			condition = 3
			activateTask("Inspection")
			deactivateTask("Permit Issuance")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
	}
	
	// 1/27/2016 Added this specifically for Electrical Commercial Commercial because the new Electrical Permit types (ELET, ELEOG, ELEG) do not require plan review
	else if (appMatch("Permits/Commercial/Electrical/Commercial")) {
		kvaASI = getAppSpecific("Job Cost")
		//jCost = parseFloat("0"+getAppSpecific("Job Cost"))
		needsPlanCheck = elecPlanCheckReq(getAppSpecific("Phase"),getAppSpecific("KVA"))
		if (""+currCapStatus == "Submitted" && !needsPlanCheck) {
			condition = 2
			activateTask("Inspection")
			deactivateTask("Permit Issuance")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
			if (parseFloat("0"+getAppSpecific("Temporary Power Pole")) > 0 ){
				createPendingInspection("PMT_ELE_C", "1001 Temporary Power")
			}
		}
		else if (""+currCapStatus == "Ready to Issue" && needsPlanCheck){
			condition = 3
			activateTask("Inspection")
			deactivateTask("Permit Issuance")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
	}
	
	else if (appMatch("Permits/Commercial/Electrical/Cell Tower") || appMatch("Permits/Commercial/Electrical/Oil or Gas Well") || appMatch("Permits/Commercial/Electrical/Water Well")) {
		condition = 2
		activateTask("Inspection")
		deactivateTask("Permit Issuance")
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
		if (parseFloat("0"+getAppSpecific("Temporary Power Pole")) > 0 ){
			createPendingInspection("PMT_ELE_C", "1001 Temporary Power")
		}
	}
	
	else if (appMatch("Permits/Modular/Decal/NA") && ""+currCapStatus == "Ready to Issue") {
		condition = 4
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	else if (appMatch("Permits/*/Mechanical/NA")) {
		jCost = parseFloat("0"+getAppSpecific("Job Cost"))
		if (""+currCapStatus == "Submitted" && jCost < MECH_JOBCOST) {
			condition = 5
			activateTask("Inspection")
			deactivateTask("Application Submittal")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
		else if (""+currCapStatus == "Ready to Issue" && jCost >= MECH_JOBCOST){
			condition = 6
			activateTask("Inspection")
			deactivateTask("Application Submittal")
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
	}
	else if (appMatch("Permits/Manufactured Housing/Set Up/NA") && ""+currCapStatus == "Submitted") {
		condition = 7
		activateTask("Inspection")
		deactivateTask("Permit Issuance")
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	else if (appMatch("Permits/Manufactured Housing/Conversion/NA") && ""+currCapStatus == "Submitted" && getAppSpecific("Setup Type")=="Conversion") {
		condition = 8
		activateTask("Permit Issuance")
		deactivateTask("Application Submittal")
		activateTask("Inspection")
		deactivateTask("Permit Issuance")
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	
	// 1/13/2017 The below two elses were added for new permit types
	else if (appMatch("Permits/Manufactured Housing/Installation/NA") && ""+currCapStatus == "Submitted") {
		condition = 9
		activateTask("Inspection")
		deactivateTask("Permit Issuance")
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	else if (appMatch("Permits/Manufactured Housing/Gas Conversion/NA") && ""+currCapStatus == "Submitted") {
		condition = 10
		activateTask("Permit Issuance")
		deactivateTask("Application Submittal")
		activateTask("Inspection")
		deactivateTask("Permit Issuance")
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
		updateStatus = "Issued"
	}
	if (updateStatus != "" ) updateAppStatus(updateStatus, "Received payment")
	if (updateIssue != "" ) editAppSpecific("Permit Issued Date", updateIssue)
	if (updateExpir != "" ) editAppSpecific("Permit Expiration Date" ,updateExpir)
	return condition 
}

function afterLPGasInspection(iType){ 
	condition = 0
	updateStatus = ""
	if((appMatch("Permits/LP Gas/Cylinder Exchange/NA") || appMatch("Permits/LP Gas/LP Form 1/NA")) && ""+iType == "LP Gas Inspection") {
		condition = 1
		updateStatus = "Finaled"
		closeTask("Inspection", "Inspection Complete", "Update via Script","Update via Script")
	}
	else if(appMatch("Permits/LP Gas/Special Events/NA") && ""+iType == "LPG Special Event Inspection" ) {
		condition = 2
		updateStatus = "Finaled"
		closeTask("Inspection", "Inspection Complete", "Update via Script","Update via Script")
	}
	else if(appMatch("Permits/LP Gas/Bulk Plant or Dispensers/NA") || appMatch("Permits/LP Gas/Cargo Tank/NA") ) {
		if (matches(""+iType,"LP Gas Inspection","Annual Inspection") ) {
			condition = 3.4
			updateStatus = "Annual"
			expDate = new Date()
			expDate.setDate(expDate.getDate() + 365)
			editAppSpecific("Permit Expiration Date" ,jsDateToASIDate(expDate))
		}
	}
	if (updateStatus != "" ) updateAppStatus(updateStatus, iType + " Inspection resulted")
	return condition
}

function updatePermitQuarterASI() {
	today = new Date()
	q = ""
	switch(Math.floor((today.getMonth())/3)) {
		case 0:
		q = "1st";	break;
		case 1:
		q = "2nd";	break;
		case 2:
		q = "3rd";	break;
		case 3:
		q = "4th";	break;
	}
	logDebug("Permit Quarter: "+q)
	if (q != "") editAppSpecific("Permit Quarter",q)
}


function populateInspectorASIfromParcelDistrict() {
	var inspectorDist = []
	var inspectorGroup = ""
	var ASIfield = "Inspector"
	//GET INSP DIST
	var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext", null).getOutput();
	var ds = initialContext.lookup("java:/AA");
	var conn = ds.getConnection();
	try{
		var SQL = "SELECT B1_DISTRICT \
			FROM B3PARCEL_DISTRICT INNER JOIN B3PARCEL \
				ON B3PARCEL_DISTRICT.B1_PER_ID1 = B3PARCEL.B1_PER_ID1 \
				AND B3PARCEL_DISTRICT.B1_PER_ID2 = B3PARCEL.B1_PER_ID2 \
				AND B3PARCEL_DISTRICT.B1_PER_ID3 = B3PARCEL.B1_PER_ID3 \
				AND B3PARCEL_DISTRICT.B1_PARCEL_NBR = B3PARCEL.B1_PARCEL_NBR \
				AND B3PARCEL_DISTRICT.SERV_PROV_CODE  = B3PARCEL.SERV_PROV_CODE \
			INNER JOIN B1PERMIT \
				ON B3PARCEL_DISTRICT.B1_PER_ID1 = B1PERMIT.B1_PER_ID1 \
				AND B3PARCEL_DISTRICT.B1_PER_ID2 = B1PERMIT.B1_PER_ID2 \
				AND B3PARCEL_DISTRICT.B1_PER_ID3 = B1PERMIT.B1_PER_ID3 \
				AND B3PARCEL_DISTRICT.SERV_PROV_CODE  = B1PERMIT.SERV_PROV_CODE \
			WHERE B1_DISTRICT > ' ' \
				AND B3PARCEL_DISTRICT.SERV_PROV_CODE = 'NEWMEX' \
				AND B1_ALT_ID = ? \
			ORDER BY B3PARCEL.B1_PRIMARY_PAR_FLG DESC"
		var dbStmt = conn.prepareStatement(SQL);
		dbStmt.setString(1,capIDString)
		dbStmt.executeQuery();
		results = dbStmt.getResultSet()
		
		while (results.next()) {
			inspectorDist.push(""+results.getString("B1_DISTRICT"))
		}
		dbStmt.close();
	}
	catch(err) {
		aa.print(err.message); 
		if (typeof dbStmt != "undefined") dbStmt.close();
	}
	conn.close()
	
	//GET INSP GROUP (DISCIPLINE)
	if (appTypeArray[1].equals("Commercial") || appTypeArray[1].equals("Residential")) {
		if(appTypeArray[2].equals("Building")) inspectorGroup = "GENERAL"
		else if(appTypeArray[2].equals("Mechanical")) inspectorGroup = "MECHANICAL"
		else if (appTypeArray[2].equals("Electrical")) inspectorGroup = "ELECTRICAL"
	}
	else if (appTypeArray[1].equals("Manufactured Housing")) { inspectorGroup = "MHD"}
	else if (appTypeArray[1].equals("LP Gas")) { 
		inspectorGroup = "LPG"
		ASIfield = "LP Gas Inspector"
	}
	
	if (inspectorGroup == "") return 1
	if (inspectorDist.length == 0) {
		logDebug("No district found on parcels attached to this record. Could not auto-assign the inspector.")
		return 2 
	}
	
	//GET LIST OF USERS BY DISCIPLINE
	userListObj = aa.people.getSysUserListByDiscipline(inspectorGroup)
	if (!userListObj.getSuccess()) {
		logDebug("***Error: could not retrieve System User List for Discipline: " + inspectorGroup)
		return 3
	}
	userList = userListObj.getOutput().toArray()
	//("UserList: "+ userList.length)
	for (d in inspectorDist) {
		logDebug("Looking for inspector for Discipline: "+ inspectorGroup + ", and District: "+inspectorDist[d])
		for ( u in userList) {
			foundInspector = false
			thisUser = userList[u]
			distListObj = aa.people.getUserDistricts(thisUser.userID)
			if ( !distListObj.getSuccess()) {
				logDebug("***Error: Could not retrieve District List for User: " + thisUser.userID)
				continue
			}
			//GET DISTRICTS FOR THIS USER
			distList = distListObj.getOutput()
			for (a in distList ) {	
				thisDist = ""+distList[a].getDistrict()
				//logDebug("Looking for Dist: " + inspectorDist[d] + ", Found: " + thisDist)
				if (thisDist.toUpperCase() == inspectorDist[d].toUpperCase()) {
					editAppSpecific(ASIfield, thisUser.firstName + " " + thisUser.lastName)
					foundInspector = true
					logDebug("Found Inspector: " + thisUser.firstName + " " + thisUser.lastName +" for District: " + inspectorDist[d])
					return
				}
			}
		}
	}
	showMessage = true;
	logMessage("No Inspector is configured for Discipline: " + inspectorGroup + " and District(s): " + inspectorDist.join(", ") + ". Please assign Manually.")
}

function validateManHouseInstall() {
	var requiredLicTypes=["MHD-01","MHD-02","MHD-03","MHD-3Y","MHD-3E"]
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in requiredLicTypes) {
			if (requiredLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + requiredLicTypes[type])
				return 3
			}
		}			
	}
	cancel = true
	showMessage = true
	logMessage("License type "+requiredLicTypes.join(" or ") + " is required for work being performed.")
	
}

function validateManHouseGasConv() {
	var requiredLicTypes=["MHD-MM02","MHD-MM98","MHD-MS02"]
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in requiredLicTypes) {
			if (requiredLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + requiredLicTypes[type])
				return 3
			}
		}			
	}
	cancel = true
	showMessage = true
	logMessage("License type "+requiredLicTypes.join(" or ") + " is required for work being performed.")
	
}

function validateManHouseRepair() {
	var requiredLicTypes=["MHD-02","MHD-03","MHD-3Y","MHD-3E","MHD-EE98", "MHD-ER01", "MHD-ES03", "MHD-GB02", "MHD-GB98","MHD-MM01", "MHD-MM02", "MHD-MM03", "MHD-MM04", "MHD-MM04", "MHD-MM98", "MHD-MS01", "MHD-MS02", "MHD-MS03"]
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in requiredLicTypes) {
			if (requiredLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + requiredLicTypes[type])
				return 3
			}
		}			
	}
	cancel = true
	showMessage = true
	logMessage("License type "+requiredLicTypes.join(" or ") + " is required for work being performed.")
	
}



function validateManHouseRefurbish() {
	var requiredLicTypes= ["Manufacturer", "MHD-MANUF"]
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in requiredLicTypes) {
			if (requiredLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + requiredLicTypes[type])
				return 3
			}
		}			
	}
	cancel = true
	showMessage = true
	logMessage("License type "+requiredLicTypes.join(" or ") + " is required for work being performed.")
	
}

function validateManHousePermFou() {
	var requiredLicTypes=["MHD-01", "MHD-02", "MHD-03", "MHD-03Y", "MHD-03E", "MHD-GB02", "MHD-GB98", "MHD-GS04"]
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in requiredLicTypes) {
			if (requiredLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + requiredLicTypes[type])
				return 3
			}
		}			
	}
	cancel = true
	showMessage = true
	logMessage("License type "+requiredLicTypes.join(" or ") + " is required for work being performed.")
	
}

function validateManHouseLicType() {
	//DEFINE REQUIRED LICENSES PER ASI FIELD
	
	var popASI = []
	var reqLic = {
		"Permanent Foundation": ["MHD-01","MHD-02","MHD-03","MHD-3Y","MHD-3E","MHD-GB02","MHD-GB98","MHD-GS04"],
		//"Setup": ["MHD-01","MHD-02","MHD-03","MHD-3Y","MHD-3E","MHD-EE98","MHD-MM01","MHD-MM02","MHD-MM03","MHD-MM04","MHD-MM98"],
		"Installation with Foundation":["MHD-01","MHD-02","MHD-03","MHD-3Y","MHD-3E"],
		"Addition": [],
		"Conversion": ["MHD-MM02","MHD-MM98","MHD-MS02","MHD-03","MHD-3Y","MHD-3E"],
		"Major Repair": ["MHD-02","MHD-03","MHD-3Y","MHD-3E","MHD-EE98","MHD-ER01","MHD-ES03","MHD-GB02","MHD-GB98","MHD-MM01","MHD-MM02","MHD-MM03","MHD-MM04","MHD-MM98","MHD-MS01","MHD-MS02","MHD-MS03"],
		"Manufacture": [],
		"Refurbish": []
	}
	
	//GET ASI FIELD THAT IS POPULATED
	for (i in AppSpecificInfoModels) {
		if (""+AppSpecificInfoModels[i].checkboxDesc == "Setup Type" && !matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checklistComment)
			break //ONLY CHECK ASI FIELD"Setup Type"
		}
	}
	
	if ( popASI.length == 0 ) {
		logDebug("None of the ASI fields used for Licence Professional validation were populated.")
		return 1
	}
	logDebug(popASI)
	reqLicTypes = []
	for ( i in popASI){
	logDebug(popASI[i]+": "+reqLic[popASI[i]])
		if (typeof reqLic[popASI[i]] == 'object') {
			if (reqLicTypes.length == 0) { reqLicTypes = reqLic[popASI[i]] }
			else { reqLicTypes = intersect(reqLicTypes, reqLic[popASI[i]]) }
		}
	}
	if(reqLicTypes.length == 0){
		logDebug("No Licence Professional restrictions for the work: " + popASI)
		return 2
	}
	
	logDebug(reqLicTypes)

	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in reqLicTypes) {
			if (reqLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + reqLicTypes[type])
				return 3
			}
		}			
	}
	
	cancel = true
	showMessage = true
	logMessage("License type "+reqLicTypes.join(" or ") + " is required for work being performed.")
	//showMessage = false
}

function validateComMechanicalLicType() {
	//DEFINE REQUIRED LICENSES PER ASI FIELD
	var popASI = []
	var reqLic = {
		"A/C Refrigeration Package System": ["MM-98","MM-03","MM-04"],
		"Cooling Tower": ["MM-98","MM-03","MM-04"],
		"Evaporative Cooler": ["MM-98","MM-03"],
		"Air handler": ["MM-98","MM-03"],
		"Package Rooftop Combination Unit": ["MM-98","MM-03","MM-04"],
		"PTAC Unit": ["MM-98","MM-03","MM-04"],
		"Variable Refrigerant Flow System": ["MM-98","MM-03","MM-04"],
		"Supply/Return System": ["MM-98","MM-03"],
		"Energy Recovery Ventilator": ["MM-98","MM-03"],
		"Terminal Units": ["MM-98","MM-03"],
		"Fan Coil Unit": ["MM-98","MM-03","MM-04"],
		"Heating Coil Unit": ["MM-98","MM-03","MM-04"],
		"Heat Pumps": ["MM-98","MM-03","MM-04"],
		"Variable Air Volume System (VAV)": ["MM-98","MM-03"],
		"Smoke Damper": ["MM-98","MM-03"],
		"Smoke/Fire Damper": ["MM-98","MM-03"],
		"Fire Damper": ["MM-98","MM-03"],
		"Ceiling Radiation Damper": ["MM-98","MM-03"],
		"Type I Commercial Kitchen Hood": ["MM-98","MM-03"],
		"Type II Commercial Kitchen Hood": ["MM-98","MM-03"],
		"Kitchen Hood Grease Duct system": ["MM-98","MM-03"],
		"Fume Hood Duct System": ["MM-98","MM-03"],
		"Product Conveying Exhaust system": ["MM-98","MM-03"],
		"Heat Recovery Ventilator": ["MM-98","MM-03"],
		"Clothes Dryer exhaust system": ["MM-98","MM-03"],
		"General Exhaust/Ventilation System": ["MM-98","MM-03"],
		"Make Up/Replacement Air Systems": ["MM-98","MM-03"],
		"Humidifiers": ["MM-98","MM-03"],
		"Heating Hydronic Supply/Return": ["MM-98","MM-04"],
		"Cooling Hydronic Supply/Return": ["MM-98","MM-04"],
		"Radiant Heat In-floor System": ["MM-98","MM-01","MM-04"],
		"Solar Space Heating System": ["MM-98","MM-01","MM-04"],
		"Heat Exchanger": ["MM-98","MM-03"],
		"Condensate Drain System": ["MM-98","MM-01","MM-04"],
		"Plumbing Fixture Unit": ["MM-98","MM-01"],
		"Water Heater": ["MM-98","MM-01"],
		"Water Heater (Electric)": ["MM-98","MM-01"],
		"Water Heater (Gas)": ["MM-98","MM-02"],
		"Water Service Piping": ["MM-98","MM-01","MM-04"],
		"Potable Water Distribution System": ["MM-98","MM-01","MM-04"],
		"Nonpotable Water Distribution System": ["MM-98","MM-01","MM-04"],
		"Reclaimed Water System": ["MM-98","MM-01","MM-04"],
		"Reverse Osmosis Water System": ["MM-98","MM-01","MM-04"],
		"Deionized Water System": ["MM-98","MM-01","MM-04"],
		"Water Softner/Conditioner": ["MM-98","MM-01"],
		"Vacuum Breaker/Hose Bibb/Hydrant": ["MM-98","MM-01"],
		"Backflow Preventer": ["MM-98","MM-01"],
		"Pressure Type Backflow Preventer": ["MM-98","MM-01"],
		"Double Check Backflow Prevention": ["MM-98","MM-01"],
		"Pressure Vacuum Backflow Prevention": ["MM-98","MM-01"],
		"Reduced Pressure Principle Backflow": ["MM-98","MM-01"],
		"Building Drain": ["MM-98","MM-01","MM-04"],
		"Building Sewer": ["MM-98","MM-01","MM-04"],
		"Sewage Ejector/Backwater Valve": ["MM-98","MM-01"],
		"Chemical Waste System": ["MM-98","MM-01","MM-04"],
		"Hydromechanical Grease Interceptor": ["MM-98","MM-01"],
		"Gravity Grease Interceptor": ["MM-98","MM-01"],
		"Oil/Flammable Liquid Interceptor": ["MM-98","MM-01"],
		"Sand Interceptor": ["MM-98","MM-01"],
		"Roof Drainage System per building": ["MM-98","MM-01"],
		"Swimming Pool Piping System": ["MM-98","MM-01"],
		"Domestic Solar Hot Water System": ["MM-98","MM-01","MM-02"],
		"LP Gas Piping System": ["MM-98","MM-02","LP-04"],
		"Natural Gas Piping System": ["MM-98"," ","MM-02"],
		"Gas Furnace": ["MM-98","MM-02","LP-04"],
		"Gas Floor Furnace": ["MM-98","MM-02","LP-04"],
		"Gas Rooftop Unit": ["MM-98","MM-02","LP-04"],
		"Gas Unit Heater": ["MM-98","MM-02","LP-04"],
		"Gas Infrared Tube Heater": ["MM-98","MM-02","LP-04"],
		"Gas Boiler": ["MM-98","MM-02","LP-04"],
		"Gas Wall Heater": ["MM-98","MM-02","LP-04"],
		"Gas Fireplace": ["MM-98","MM-02","LP-04"],
		"Gas Range": ["MM-98","MM-02","LP-04"],
		"Gas Dryer": ["MM-98","MM-02","LP-04"],
		"Gas Other Capped Opening i.e; BBQ outlet": ["MM-98","MM-02","LP-04"],
		"Power Hot Water Boiler": ["MM-98","MM-01","MM-02"],
		"Pressure Vessel": ["MM-98","MM-01","MM-02","MM-04"],
		"Kiln": ["MM-98","MM-02","MM-03"],
		"Pool Heater": ["MM-98","MM-02","MM-03"],
		"Infrared Tube Heater": ["MM-98","MM-02","MM-03"],
		"Incinerator": ["MM-98","MM-02","MM-03"],
		"Hot Water Heating Boiler": ["MM-98","MM-02","MM-03","MM-04"],
		"Med Gas Piping System 1 to 5 inlets/outlets": ["MM-98","MM-01","MM-04"],
		"Med Gas Each Additional inlet/outlet": ["MM-98","MM-01","MM-04"]
	}
	
	//GET ASI FIELD THAT IS POPULATED
	for (i in AppSpecificInfoModels) {
		if (!matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checkboxDesc)
		}
	}
	
	if ( popASI.length == 0 ) {
		logDebug("None of the ASI fields used for Licence Professional validation were populated.")
		return 1
	}
	logDebug(popASI)
	reqLicTypes = []
	for ( i in popASI){
	logDebug(popASI[i]+": "+reqLic[popASI[i]])
		if (typeof reqLic[popASI[i]] == 'object') {
			if (reqLicTypes.length == 0) { reqLicTypes = reqLic[popASI[i]] }
			else { reqLicTypes = intersect(reqLicTypes, reqLic[popASI[i]]) }
		}
	}
	if(reqLicTypes.length == 0){
		logDebug("No Licence Professional restrictions for the work: " + popASI)
		return 2
	}
	
	logDebug(reqLicTypes)

	/*var capLicenseResult = aa.licenseScript.getLicenseProf(capId);
	if( capLicenseResult.getSuccess() ) { 
		var capLicenseArr = capLicenseResult.getOutput();
	*/
	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in reqLicTypes) {
			if (reqLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + reqLicTypes[type])
				return 3
			}
		}			
	}
	//}
	
	cancel = true
	showMessage = true
	logMessage("License type "+reqLicTypes.join(" or ") + " is required for work being performed.")
	//showMessage = false
}

function validateResMechanicalLicType() {
	//DEFINE REQUIRED LICENSES PER ASI FIELD
	var popASI = []
	var reqLic = {
		"A/C Refrigeration Package System": ["MM-03"],
		"Air Handler": ["MM-98","MM-03"],
		"Supply/Return System": ["MM-98","MM-03"],
		"Heat Pumps": ["MM-98","MM-03"],
		"Clothes Dryer exhaust system": ["MM-98","MM-03"],
		"Humidifiers": ["MM-98","MM-03"],
		"Radiant Heat In-floor System": ["MM-98","MM-01","MM-04"],
		"Solar Space Heating System": ["MM-98","MM-01","MM-04"],
		"Heat Exchanger": ["MM-98","MM-01","MM-03"],
		"Condensate Drain System": ["MM-04"],
		"Plumbing Fixture Unit": ["MM-98","MM-01"],
		"Water Heater": ["MM-98","MM-01"],
		"Water Heater (Electric)": ["MM-98","MM-01"],
		"Water Heater (Gas)": ["MM-98","MM-02"],
		"Potable Water Distribution System": ["MM-98","MM-01","MM-04"],
		"Nonpotable Water distribution  System": ["MM-98","MM-01","MM-04"],
		"Reclaimed Water System": ["MM-98","MM-01","MM-04"],
		"RO Water System": ["MM-98","MM-01","MM-04"],
		"Water Softner/Conditioner": ["MM-98","MM-01"],
		"Vacuum Breaker/House Bibb/Hydrant": ["MM-98","MM-01"],
		"Building Drain": ["MM-98","MM-01","MM-04"],
		"Building Sewer": ["MM-98","MM-01","MM-04"],
		"Sewage Ejector/Backwater Valve": ["MM-98","MM-01"],
		"Roof Drainage System per building": ["MM-98","MM-01"],
		"Swimming Pool Piping System": ["MM-98","MM-01"],
		"Domestic Solar Hot Water System": ["MM-98","MM-01","MM-04"],
		"LP Gas Piping System": ["MM-98","MM-02","LP-04"],
		"Natural Gas Piping System": ["MM-98","MM-02"],
		"Gas Furnace": ["MM-98","MM-02","LP-04"],
		"Gas Floor Furnace": ["MM-98","MM-02","LP-04"],
		"Gas Rooftop Unit": ["MM-98","MM-02","LP-04"],
		"Gas Unit Heater": ["MM-98","MM-02","LP-04"],
		"Gas Boiler": ["MM-98","MM-02","LP-04"],
		"Gas Wall Heater": ["MM-98","MM-02","LP-04"],
		"Gas Fireplace": ["MM-98","MM-02","LP-04"],
		"Gas Range": ["MM-98","MM-02","LP-04"],
		"Gas Dryer": ["MM-98","MM-02","LP-04"],
		"Gas Other Capped Opening i.e; BBQ outlet": ["MM-98","MM-02","LP-04"],
		"Kiln": ["MM-98","MM-02","LP-04"],
		"Pool Heater": ["MM-98","MM-02","LP-04"],
		"Hot Water Heater Boiler": ["MM-98","MM-02","LP-04"]
	}
	
	//GET ASI FIELD THAT IS POPULATED
	for (i in AppSpecificInfoModels) {
		if (!matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			popASI.push(""+AppSpecificInfoModels[i].checkboxDesc)
		}
	}
	
	if ( popASI.length == 0 ) {
		logDebug("None of the ASI fields used for Licence Professional validation were populated.")
		return 1
	}
	//logDebug(popASI)
	reqLicTypes = []
	for ( i in popASI){
	logDebug(popASI[i]+": "+reqLic[popASI[i]])
		if (typeof reqLic[popASI[i]] == 'object') {
			if (reqLicTypes.length == 0) { reqLicTypes = reqLic[popASI[i]] }
			else { reqLicTypes = intersect(reqLicTypes, reqLic[popASI[i]]) }
		}
	}
	if(reqLicTypes.length == 0){
		logDebug("No Licence Professional restrictions for the work: " + popASI)
		return 2
	}
	
	logDebug(reqLicTypes)

	capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch(err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		logDebug("Found Licence Type: " + capLicenseArr[licProf].getLicenseType())
		for( type in reqLicTypes) {
			if (reqLicTypes[type] == capLicenseArr[licProf].getLicenseType()) {
				logDebug("Found valid LP Type: " + reqLicTypes[type])
				return 3
			}
		}			
	}
	
	cancel = true
	showMessage = true
	logMessage("License type "+reqLicTypes.join(" or ") + " is required for work being performed.")
	//showMessage = false
}


function preventinvalidTrackingNum() {
	trackNum = ""
	for (i in AppSpecificInfoModels) {
		if (""+AppSpecificInfoModels[i].checkboxDesc == "Plan Review Tracking #" && !matches(""+AppSpecificInfoModels[i].checklistComment,"","null")) {
			trackNum = ""+AppSpecificInfoModels[i].checklistComment
			break
		}
	}

	thisAddress = AddressHouseNumber == "" ? "null|": AddressHouseNumber + "|"
	thisAddress += AddressStreetDirection == "" ? "null|": AddressStreetDirection + "|"
	thisAddress += AddressStreetName == "" ? "null|": AddressStreetName + "|"
	thisAddress += AddressStreetSuffix == "" ? "null|": AddressStreetSuffix + "|"
	thisAddress += AddressCity == "" ? "null|": AddressCity + "|"
	thisAddress += AddressZip == "" ? "null": AddressZip 

	thisParcel = ParcelValidatedNumber 
	trackAddress = ""
	trackParcel = ""
	var trackIdObj = aa.cap.getCapID(trackNum)
	if (trackIdObj.getSuccess()) {
		var trackId = trackIdObj.getOutput()
		
		var addr = aa.address.getAddressByCapId(trackId)
		if (addr.getSuccess()) {
			addrList = addr.getOutput()
			for ( i in addrList) {
				if (addrList[i].getPrimaryFlag() == "Y") trackAddress = addrList[i].getHouseNumberStart()+"|"+addrList[i].getStreetDirection()+"|"+addrList[i].getStreetName()+"|"+addrList[i].getStreetSuffix()+"|"+addrList[i].getCity()+"|"+addrList[i].getZip()
			}
		}
		
		var par = aa.parcel.getParcelByCapId(trackId,null)
		if (par.getSuccess()) {
			parList = par.getOutput().toArray()
			for ( i in parList) {
				if (parList[i].getPrimaryParcelFlag() == "Y") trackParcel = ""+parList[i].getParcelNumber()
			}
		}
		logDebug("ThisRecord: " + thisAddress +": "+thisParcel)
		logDebug("TrackRecord: " + trackAddress +": "+trackParcel)
		var capResult = aa.cap.getCap(trackId)
		if (capResult.getSuccess()) {
			trackCap = capResult.getOutput()
			if (trackCap) {
				appTypeResult = trackCap.getCapType();
				appTypeString = appTypeResult.toString();
				appStatus = ""+trackCap.getCapStatus();
				if (appTypeString == "Permits/Plan Review/NA/NA" && (appStatus == "Approved" || appStatus == "Not Required")) {
					if (thisAddress.toUpperCase() == trackAddress.toUpperCase() && thisParcel.toUpperCase() == trackParcel.toUpperCase() )  return true
				}
			}
		}
	}
	cancel = true
	showMessage = true
	logMessage("Invalid Tracking Number")
	return false
}

function enforceReqTrackNum() {
	bizDomScriptResult = aa.bizDomain.getBizDomainByValue("REQUIRE_TRACKING_NUMBER","DATE");
	if (bizDomScriptResult.getSuccess()) {
		var bizDomScriptObj = bizDomScriptResult.getOutput();
		var today = new Date()
		var reqDate = ""+bizDomScriptObj.getDescription()
		var enfDate = new Date(reqDate)
		if (today < enfDate) return false
	}
	return true
}
	

function afterPermitIssuance(wTask, wStatus) {
	issDate = new Date()
	expDate = new Date()
	updateIssue = ""
	updateExpir = ""
	updateStatus = ""
	pendInsp = ""
	condition = 0
	areFeesPaid = (balanceDue <= 0 && feeTotalByStatus("NEW") <= 0)

	if ((appMatch("Permits/Commercial/*/*") || appMatch("Permits/Residential/*/*") || appMatch("Permits/Manufactured Housing/*/*")) && matches(""+wStatus,"Issue","Issued")) {
		if (areFeesPaid && appMatch("Permits/*/Building/NA") && !feeExists("PERMIT","NEW","INVOICED")) {
			areFeesPaid = false
			showMessage = true
			logMessage("Permit Fee is required before this permit can be Issued")
		}
		
		if (areFeesPaid) {
			condition = 11
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
		else {
			condition = 12
			updateStatus = "Ready to Issue"
		}
		
		if (appMatch("Permits/*/Electrical/*") && parseFloat("0"+getAppSpecific("Temporary Power Pole")) > 0 ){
			createPendingInspection("PMT_ELE_"+appTypeArray[1].substring(0,1), "1001 Temporary Power")
		}
	}
	
	else if (appMatch("Permits/Modular/Decal/NA") && ((""+wTask == "Application Submittal" && matches(""+wStatus,"Accepted - Plan Review Not Req")) || (""+wTask == "Plan Review" && matches(""+wStatus,"Approved","Approved w/Comments","Not Required"))) ) {
		if (areFeesPaid) {
			condition = 21
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 180)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
		}
		else {
			condition = 22
			updateStatus = "Ready to Issue" 
			//updateStatus = "Ready to Inspections" 
		}
	}

	else if (appMatch("Permits/LP Gas/LP Form 1/NA") && ""+wTask == "LP Gas Plan Review" && matches(""+wStatus,"Approved","Approved w/Comments","Not Required")) {
		if (areFeesPaid) {
			condition = 31
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 30)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"

			editTaskDueDate("Inspection",updateExpir)
			assignTask("Inspection",getUserIdByName(""+getAppSpecific("LP Gas Inspector")))
		}
		else {
			condition = 32
			updateStatus = "Ready to Issue" 
		}
	}
	
	else if (appMatch("Permits/LP Gas/Special Events/NA") && ""+wTask == "Application Submittal" && matches(""+wStatus,"Accepted")) {
		if (areFeesPaid) {
			condition = 41
			//updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 30)
			//updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"
			
			editTaskDueDate("Inspection",jsDateToASIDate(jsDateToASIDate(expDate)))
			assignTask("Inspection",getUserIdByName(""+getAppSpecific("LP Gas Inspector")))
		}
		else {
			condition = 42
			updateStatus = "Ready to Issue" 
		}
	}
	
	else if (appMatch("Permits/LP Gas/Cylinder Exchange/NA") && ((""+wTask == "Application Submittal" && matches(""+wStatus,"Accepted - Plan Review Not Req")) || (""+wTask == "LP Gas Plan Review" && matches(""+wStatus,"Approved","Approved w/Comments","Not Required")))) {
		if (areFeesPaid) {
			condition = 51
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 30)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"

			editTaskDueDate("Inspection",updateExpir)
			assignTask("Inspection",getUserIdByName(""+getAppSpecific("LP Gas Inspector")))
		}
		else {
			condition = 52
			updateStatus = "Ready to Issue" 
		}
	}
	
	else if (appMatch("Permits/LP Gas/Cargo Tank/NA") && ""+wTask == "Permit Issuance" && matches(""+wStatus,"Issue","Issued")) {
		if (areFeesPaid) {
			condition = 61
			updateIssue = jsDateToASIDate(issDate)
			expDate.setDate(expDate.getDate() + 30)
			updateExpir = jsDateToASIDate(expDate)
			updateStatus = "Issued"

			editTaskDueDate("Inspection",updateExpir)
			assignTask("Inspection",getUserIdByName(""+getAppSpecific("LP Gas Inspector")))
		}
		else {
			condition = 62
			updateStatus = "Ready to Issue" 
		}
	}

	if (updateStatus != "" ) updateAppStatus(updateStatus, "Issued via Workflow")
	if (updateIssue != "" ) editAppSpecific("Permit Issued Date", updateIssue)
	if (updateExpir != "" ) editAppSpecific("Permit Expiration Date" ,updateExpir)
	return condition
}

function afterPermitManualIssuance() {
	issDate = new Date()
	expDate = new Date()
	updateIssue = ""
	updateExpir = ""
	if (appMatch("Permits/LP Gas/*/*")) {
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 30)
		updateExpir = jsDateToASIDate(expDate)

		editTaskDueDate("Inspection",updateExpir)
		assignTask("Inspection",getUserIdByName(""+getAppSpecific("LP Gas Inspector")))
	}
	if (appMatch("Permits/Commercial/*/*") || appMatch("Permits/Residential/*/*") || appMatch("Permits/Manufactured Housing/*/*") || appMatch("Permits/Modular/Decal/NA")) {
		updateIssue = jsDateToASIDate(issDate)
		expDate.setDate(expDate.getDate() + 180)
		updateExpir = jsDateToASIDate(expDate)
	}
	
	if (updateIssue != "" ) editAppSpecific("Permit Issued Date", updateIssue)
	if (updateExpir != "" ) editAppSpecific("Permit Expiration Date" ,updateExpir)
}


function getAddressString() {
	var addrArr = []
	var addr = aa.address.getAddressByCapId(capId)
	if (addr.getSuccess()) {
		addrList = addr.getOutput()
		for ( i in addrList) {
			if (addrList[i].getPrimaryFlag() == "Y") {
				if (!matches(""+addrList[i].getHouseNumberStart(),"","null")) addrArr.push(""+addrList[i].getHouseNumberStart())
				if (!matches(""+addrList[i].getStreetDirection(),"","null")) addrArr.push(""+addrList[i].getStreetDirection())
				if (!matches(""+addrList[i].getStreetName(),"","null")) addrArr.push(""+addrList[i].getStreetName())
				if (!matches(""+addrList[i].getStreetSuffix(),"","null")) addrArr.push(""+addrList[i].getStreetSuffix())
				if (!matches(""+addrList[i].getCity(),"","null")) addrArr.push(""+addrList[i].getCity())
				if (!matches(""+addrList[i].getZip(),"","null")) addrArr.push(""+addrList[i].getZip())
				return addrArr.join(" ")
			}
		}
	}
}

function withdrawnRecordNotification(wTask) {
	var emailFrom = "RLD.CitizenAccess@state.nm.us"
	var emailTo = "mike.linscheid@woolpert.com"
	var emailCC = ""
	var templateName = "PERMITS MHD WITHDRAWN EMAIL NOTIFICATION"
	sendEmail = false
	if (appMatch("Permits/Manufactured Housing/*/*") && ""+wTask == "Plan Review"){
		sendEmail = true
	}
	else if (appMatch("Permits/Commercial/Building/*") && ""+wTask == "Plan Coordination"){
		sendEmail = true
	}
	else if (appMatch("Permits/Residential/Building/*") && ""+wTask == "Plan Coordination"){
		sendEmail = true
	}
	else if (appMatch("Permits/Plan Review/*/*") && ""+wTask == "Plan Review"){
		sendEmail = true
	}
	
	if (sendEmail) {
		updateAppStatus("Closed", "Withdrawn")
		var eParams = aa.util.newHashtable();
		eParams.put("$$altId$$", capIDString);
		sendNotification(emailFrom, emailTo, emailCC, templateName, eParams, null)
		return 1
	}
	return 2
}

function sendNotification(emailFrom, emailTo, emailCC, templateName, params, reportFile) {
    var itemCap = capId;
    if (arguments.length == 7) itemCap = arguments[6]; // use cap ID specified in args

    var id1 = itemCap.ID1;
    var id2 = itemCap.ID2;
    var id3 = itemCap.ID3;

    var capIDScriptModel = aa.cap.createCapIDScriptModel(id1, id2, id3);


    var result = null;
    result = aa.document.sendEmailAndSaveAsDocument(emailFrom, emailTo, emailCC, templateName, params, capIDScriptModel, reportFile);
    if (result.getSuccess()) {
        logDebug("Sent email successfully to " + emailTo);
        return true;
    }
    else {
        logDebug("Failed to send mail. - " + result.getErrorType());
        return false;
    }
}



function applyReinspectionFee(iStatus){
	fSched = ""
	fCode = ""
	templateName = "PERMITS 2ND REINSPECTION FEE NOTIFICATION"
	emailFrom = "RLD.CitizenAccess@state.nm.us"
	emailTo = getLPEmail()
	emailCC = getApplicantEmail()
	
	if (matches(iStatus, "FAIL - 2nd FEE")){
		//Send Email [TO WHOM?]
		var eParams = aa.util.newHashtable();
		eParams.put("$$altId$$", capIDString);
		sendNotification(emailFrom, emailTo, emailCC, templateName, eParams, null)
	}
	
	if (appMatch("Permits/Commercial/Electrical/*")){
		fSched = "PMT_COM_ELEC"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
		else if (iStatus == "FAIL - 2nd FEE") fCode = "REINSPECT2"
	}
	else if (appMatch("Permits/Residential/Electrical/NA")){
		fSched = "PMT_RES_ELEC"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
		else if (iStatus == "FAIL - 2nd FEE") fCode = "REINSPECT2"
	}
	
	else if (appMatch("Permits/*/Electrical/*")){
		fSched = "PMT_COM_GEN"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
		else if (iStatus == "FAIL - 2nd FEE") fCode = "REINSPECT2"
	}
	
	else if (appMatch("Permits/Commercial/Mechanical/NA")){
		fSched = "PMT_COMM_MECH"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
		else if (iStatus == "FAIL - 2nd FEE") fCode = "REINSPECT2"
	}
	else if (appMatch("Permits/Residential/Mechanical/NA")){
		fSched = "PMT_RES_MEC"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
		else if (iStatus == "FAIL - 2nd FEE") fCode = "REINSPECT2"
	}
	else if (appMatch("Permits/LP Gas/Bulk Plant or Dispensers/NA")){
		fSched = "PMT_LP_BULK"
		if (iStatus == "Corrections 1st Fee") fCode = "LPPLTRENSP"
	}	
	else if (appMatch("Permits/LP Gas/LP Form 1/NA")){
		fSched = "PMT_LP_FORM"
		if (iStatus == "Corrections 1st Fee") fCode = "FRM1REINSP"
		else if (iStatus == "Corrections 2nd Fee") fCode = "FRM1SUBSQ"
	}
	else if (appMatch("Permits/LP Gas/Cargo Tank/NA")){
		fSched = "PMT_LP_CARGO"
		if (iStatus == "Corrections 1st Fee") fCode = "LPGCGOREIN"
	}
	else if (appMatch("Permits/LP Gas/Cylinder Exchange/NA")){
		fSched = "PMT_LP CYLINDER"
		if (iStatus == "Corrections 1st Fee") fCode = "LPCEREINSP"
	}
	else if (appMatch("Permits/Modular/Decal/NA")){
		fSched = "PMT_MOD"
		if (iStatus == "FAIL - 1st FEE") fCode = "REINSPECT"
	}
	else if (appMatch("Permits/Manufactured Housing/Gas Conversion/NA")){
		fSched = "PMT_MHDC2"
		if (iStatus == "FAIL") fCode = "MHDREINSP"
	}
	else if (appMatch("Permits/Manufactured Housing/Conversion/NA")){
		fSched = "PMT_MHDC"
		if (iStatus == "FAIL") fCode = "REINSPECT"
	}
	else if (appMatch("Permits/Manufactured Housing/Permanent Foundation/NA")){
		fSched = "PMT_MHDF"
		if (iStatus == "FAIL") fCode = "REINSPECT"
	}
	else if (appMatch("Permits/Manufactured Housing/Installation/NA")){
		fSched = "PMT_MHDS"
		if (iStatus == "FAIL") fCode = "REINSPECT"
	}
	else if (appMatch("Permits/Manufactured Housing/Refurbish/NA")){
		fSched = "MHDREFB"
		if (iStatus == "FAIL") fCode = "REINSPECT"
	}
	else if (appMatch("Permits/Manufactured Housing/Repair Permit/NA")){
		fSched = "PMT_MHDC"
		if (iStatus == "FAIL") fCode = "REINSPECT"
	}
	if (fSched != "" && fCode != "") addFee(fCode, fSched, "FINAL", 1, "Y")
}

function getLPEmail() {
	var licArray = new Array();
	var capLicenseResult = aa.licenseScript.getLicenseProf(capId);
	if (capLicenseResult.getSuccess()) {
		licArray = capLicenseResult.getOutput();
	} 
	for (i in licArray) {
		if (""+licArray[i].getPrintFlag() == "Y") {
			if ( (""+licArray[i].getEmail()).indexOf("@") > 0 )
				return ""+licArray[i].getEmail()
		}
	}
	return ""
}

function getApplicantEmail() {
	conList = getContactArray()
	for (i in conList) {
		if (""+conList[i].contactType == "Applicant") {
			if ( (""+conList[i].email).indexOf("@") > 0 ) return ""+conList[i].email
		}
	}	
	return ""
}



function voidRemoveFees(vFeeCode)
	{
	var feeSeqArray = new Array();
	var invoiceNbrArray = new Array();
	var feeAllocationArray = new Array();
    var itemCap = capId;
    if (arguments.length > 1)
        itemCap = arguments[1];
 
	// for each fee found
	//  	  if the fee is "NEW" remove it
	//  	  if the fee is "INVOICED" void it and invoice the void
	//
	
	var targetFees = loadFees(itemCap);

	for (tFeeNum in targetFees)
		{
		targetFee = targetFees[tFeeNum];

		if (targetFee.code.equals(vFeeCode))
			{

			// only remove invoiced or new fees, however at this stage all AE fees should be invoiced.

			if (targetFee.status == "INVOICED")
				{
				var editResult = aa.finance.voidFeeItem(itemCap, targetFee.sequence);

				if (editResult.getSuccess())
					logDebug("Voided existing Fee Item: " + targetFee.code);
				else
					{ logDebug( "**ERROR: voiding fee item (" + targetFee.code + "): " + editResult.getErrorMessage()); return false; }

				var feeSeqArray = new Array();
				var paymentPeriodArray = new Array();

				feeSeqArray.push(targetFee.sequence);
				paymentPeriodArray.push(targetFee.period);
				var invoiceResult_L = aa.finance.createInvoice(itemCap, feeSeqArray, paymentPeriodArray);

				if (!invoiceResult_L.getSuccess())
					{
					logDebug("**ERROR: Invoicing the fee items voided " + thisFee.code + " was not successful.  Reason: " +  invoiceResult_L.getErrorMessage());
					return false;
					}

				}



			if (targetFee.status == "NEW")
				{
				// delete the fee
				var editResult = aa.finance.removeFeeItem(itemCap, targetFee.sequence);

				if (editResult.getSuccess())
					logDebug("Removed existing Fee Item: " + targetFee.code);
				else
					{ logDebug( "**ERROR: removing fee item (" + targetFee.code + "): " + editResult.getErrorMessage()); return false; }

				}

			} // each matching fee
		}  // each  fee
}  // function


function populateInspectorASIfromAddress() {
	var inspectorDist = []
	var inspectorGroup = ""
	var ASIfield = "Inspector"
	
	var capAddressResult = aa.address.getAddressByCapId(capId);
	if (capAddressResult.getSuccess()) {
		Address = capAddressResult.getOutput();
		for (a in Address) {
			if (a==0 || "Y"==Address[a].getPrimaryFlag()) {
				if (Address[a].getZip() != null && Address[a].getCity() != null)
					inspectorDist.push(Address[a].getZip().substr(0,5) + "-" + Address[a].getCity().toUpperCase())
				else
					return;
			}
		}
	}
	
	//GET INSP GROUP (DISCIPLINE)
	if (appTypeArray[1].equals("Commercial") || appTypeArray[1].equals("Residential")) {
		if(appTypeArray[2].equals("Building")) inspectorGroup = "GENERAL"
		else if(appTypeArray[2].equals("Mechanical")) inspectorGroup = "MECHANICAL"
		else if (appTypeArray[2].equals("Electrical")) inspectorGroup = "ELECTRICAL"
	}
	else if (appTypeArray[1].equals("Manufactured Housing")) { inspectorGroup = "MHD"}
	else if (appTypeArray[1].equals("LP Gas")) { 
		inspectorGroup = "LPG"
		ASIfield = "LP Gas Inspector"
		if (!matches(AInfo[ASIfield], "", null)) return
	}
	
	if (inspectorGroup == "") return 1
	if (inspectorDist.length == 0) {
		logDebug("No primary address found on this record. Could not auto-assign the inspector.")
		return 2 
	}
	
	//GET LIST OF USERS BY DISCIPLINE
	userListObj = aa.people.getSysUserListByDiscipline(inspectorGroup)
	if (!userListObj.getSuccess()) {
		logDebug("***Error: could not retrieve System User List for Discipline: " + inspectorGroup)
		return 3
	}
	userList = userListObj.getOutput().toArray()
	//("UserList: "+ userList.length)
	for (d in inspectorDist) {
		logDebug("Looking for inspector for Discipline: "+ inspectorGroup + ", and District: "+inspectorDist[d])
		for ( u in userList) {
			foundInspector = false
			thisUser = userList[u]
			distListObj = aa.people.getUserDistricts(thisUser.userID)
			if ( !distListObj.getSuccess()) {
				logDebug("***Error: Could not retrieve District List for User: " + thisUser.userID)
				continue
			}
			//GET DISTRICTS FOR THIS USER
			distList = distListObj.getOutput()
			for (a in distList ) {	
				thisDist = ""+distList[a].getDistrict()
				//logDebug("Looking for Dist: " + inspectorDist[d] + ", Found: " + thisDist)
				if (thisDist.toUpperCase() == inspectorDist[d].toUpperCase()) {
					editAppSpecific(ASIfield, thisUser.firstName + " " + thisUser.lastName)
					foundInspector = true
					logDebug("Found Inspector: " + thisUser.firstName + " " + thisUser.lastName +" for District: " + inspectorDist[d])
					return
				}
			}
		}
	}
	showMessage = true;
	logMessage("No Inspector is configured for Discipline: " + inspectorGroup + " and District(s): " + inspectorDist.join(", ") + ". Please assign Manually.")
}


function validateHomeownerHasPassedTest() {
	var lpNum = ""
	var reqTest = []
	var isTestReq = true
	var capLicenseArr = null
	try {
		capLicenseArr = LicProfList.toArray()
	} catch (err) {logDebug(err)}
	
	for( licProf in capLicenseArr ) {
		if (""+capLicenseArr[licProf].getBusinessName().toUpperCase() == "HOMEOWNER") {
			lpNum = ""+capLicenseArr[licProf].getLicenseNbr()
			break
		}			
	}

	//IF NO HOMEOWNER LP
	if (lpNum == "") return 1
	
	//CANCEL FOR LISTED RECORD TYPES WHERE HOMEOWNER NOT PERMITTED
	if ( appMatch("Permits/Commercial/Building/NA")  
			|| appMatch("Permits/LP Gas/*/*") || appMatch("Permits/Modular/Decal/NA")) {
		cancel = true;
		showMessage = true;
		logMessage("License Professional must be a State Licensed Contractor for this permit. Homeowner is not permitted.")
		return 2
	}
	
	//CHECK FOR ASI OVERRIDE
	for (i in AppSpecificInfoModels) {
		if (""+AppSpecificInfoModels[i].checkboxDesc == "Required Test" && ""+AppSpecificInfoModels[i].checklistComment == "No") {
			isTestReq = false
			break 
		}
	}

	if (isTestReq) {
		//CANCEL IF HOMEOWNER NOT 12345
		if (lpNum != "12345") {
			cancel = true;
			showMessage = true;
			logMessage("License Professional must have the license number 12345.")
			return 3
		}
		
		//GET REQUIRED TESTS
		if (appTypeArray[1].equals("Commercial") || appTypeArray[1].equals("Residential")) {
			if (appTypeArray[2].equals("Electrical")) reqTest.push("Electrical")
			else if(appTypeArray[2].equals("Mechanical")) reqTest.push("Plumbing")
		}
		else if (appTypeArray[1].equals("Manufactured Housing")){
			if (appTypeArray[2].equals("Conversion") /*&& (""+getAppSpecific("Correction due to Violation",lpNum))[0] == "Y"*/) reqTest.push("MHD-Installer")
			else if (appTypeArray[2].equals("Foundation") ) {
				setupType = ""			
				for (i in AppSpecificInfoModels) {
					if (""+AppSpecificInfoModels[i].checkboxDesc == "Setup Type" ) {
						setupType = ""+AppSpecificInfoModels[i].checklistComment
						break
					}
				}
				logDebug("checking ASI: "+setupType)
				if (setupType.equals("Foundation"))reqTest.push("MHD-Foundation")
				else if (setupType.equals("Setup"))reqTest.push("MHD-Set Up")
				else if (setupType.equals("Setup with Foundation")) {reqTest.push("MHD-Foundation"); reqTest.push("MHD-Set Up")}
			}
		}
		
		HOMEOWNERTEST = null
		loadASITablesBefore()
		
		for (t in reqTest) {
			logDebug("Checking for test: " + reqTest[t])
			var mostRecent = null
			var passed = false
			for (r in HOMEOWNERTEST) {
				logDebug("-Found this Test: " + HOMEOWNERTEST[r]["Type of Test"])
				if (HOMEOWNERTEST[r]["Type of Test"].equals(reqTest[t])) {
					thisTest = new Date(HOMEOWNERTEST[r]["Date of Test"])
					if (mostRecent == null || mostRecent < thisTest) {
						mostRecent = thisTest
						passed = HOMEOWNERTEST[r]["Pass/fail"].equals("Pass")
					}
				}
				//logDebug("Currently passing: "+passed+", on: " + mostRecent)
			}
			if (!passed) {
				cancel = true;
				showMessage = true;
				logMessage("Homeowner is required to pass the " + reqTest.join(" and ") + " test" + (reqTest.length > 1 ? "s." : "." ))
				return 6
			}
		}
		logDebug("Homeowner has passed all required tests.")
		return true	
	}
}		

function invoiceAllFees() {
	var feeArr = loadFees();
	for (x in feeArr) {
		thisFee = feeArr[x];
		if (matches(thisFee.status,"NEW") && thisFee.amount != 0) {
			invoiceFee(thisFee.code,thisFee.period);
		}
	}
}
