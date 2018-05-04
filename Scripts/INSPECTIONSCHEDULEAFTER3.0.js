/*------------------------------------------------------------------------------------------------------/
| Program : InspectionScheduleAfter3.0.js
|
| Usage   : Master Script by Accela.  See accompanying documentation and release notes.
|
| Client  : N/A
| Action# : N/A
|
| Notes   :
|
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
var controlString = "InspectionScheduleAfter"; 				// Standard choice for control
var preExecute = "PreExecuteForAfterEvents"				// Standard choice to execute first (for globals, etc)
var documentOnly = false;						// Document Only -- displays hierarchy of std choice steps

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 3.0;

var useSA = false;
var SA = null;
var SAScript = null;
var bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS","SUPER_AGENCY_FOR_EMSE"); 
if (bzr.getSuccess() && bzr.getOutput().getAuditStatus() != "I") { 
	useSA = true; 	
	SA = bzr.getOutput().getDescription();
	bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS","SUPER_AGENCY_INCLUDE_SCRIPT"); 
	if (bzr.getSuccess()) { SAScript = bzr.getOutput().getDescription(); }
	}
	
if (SA) {
	eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS",SA));
	eval(getScriptText("INCLUDES_ACCELA_GLOBALS",SA));
	eval(getScriptText(SAScript,SA));
	}
else {
	eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
	eval(getScriptText("INCLUDES_ACCELA_GLOBALS"));
	}
	
eval(getScriptText("INCLUDES_CUSTOM"));

if (documentOnly) {
	doStandardChoiceActions(controlString,false,0);
	aa.env.setValue("ScriptReturnCode", "0");
	aa.env.setValue("ScriptReturnMessage", "Documentation Successful.  No actions executed.");
	aa.abortScript();
	}

var prefix = lookup("EMSE_VARIABLE_BRANCH_PREFIX",vEventName);

var controlFlagStdChoice = "EMSE_EXECUTE_OPTIONS";
var doStdChoices = true;  // compatibility default
var doScripts = false;
var bzr = aa.bizDomain.getBizDomain(controlFlagStdChoice ).getOutput().size() > 0;
if (bzr) {
	var bvr1 = aa.bizDomain.getBizDomainByValue(controlFlagStdChoice ,"STD_CHOICE");
	doStdChoices = bvr1.getSuccess() && bvr1.getOutput().getAuditStatus() != "I";
	var bvr1 = aa.bizDomain.getBizDomainByValue(controlFlagStdChoice ,"SCRIPT");
	doScripts = bvr1.getSuccess() && bvr1.getOutput().getAuditStatus() != "I";
	}

	
function getScriptText(vScriptName){
	var servProvCode = aa.getServiceProviderCode();
	if (arguments.length > 1) servProvCode = arguments[1]; // use different serv prov code
	vScriptName = vScriptName.toUpperCase();	
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	try {
		var emseScript = emseBiz.getScriptByPK(servProvCode,vScriptName,"ADMIN");
		return emseScript.getScriptText() + "";	
		} catch(err) {
		return "";
	}
}

/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var InspectionDate = aa.env.getValue("InspectionDate");		logDebug("InspectionDate = " + InspectionDate  );
var InspectionMode = aa.env.getValue("InspectionMode");		logDebug("InspectionMode = " +  InspectionMode  );
var InspectionTime = aa.env.getValue("InspectionTime");		logDebug("InspectionTime = " + InspectionTime  );
var InspectionType = aa.env.getValue("InspectionType");		logDebug("InspectionType = " + InspectionType);
var InspectionTypeList = aa.env.getValue("InspectionTypeList");	logDebug("InspectionTypeList = " + InspectionTypeList   );
var InspectionIdList = aa.env.getValue("InspectionIdList");	logDebug("InspectionIdList = " + InspectionIdList   );
var InspectorFirstName = aa.env.getValue("InspectorFirstName");	logDebug("InspectorFirstName = " + InspectorFirstName   );
var InspectorLastName = aa.env.getValue("InspectorLastName");	logDebug("InspectorLastName = " +  InspectorLastName  );
var InspectorMiddleName = aa.env.getValue("InspectorMiddleName");logDebug("InspectorMiddleName = " + InspectorMiddleName  );
var NumberOfInspections = aa.env.getValue("NumberOfInspections");logDebug("NumberOfInspections = " +   NumberOfInspections );
var inspTypeArr = String(InspectionTypeList).split("|");   		// Submitted Inspection Type Array
var inspIdArr = String(InspectionIdList).split("|");			// Inspection identifier Array

// Main Loop is affected by number of inspections, see below

if (inspIdArr.length == 0) logDebug("WARNING: Inspection ID List is zero length.  No actions will be performed.  To rectify, the system administrator must add the InspectionIdList parameter to this event");
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

if (preExecute.length) doStandardChoiceActions(preExecute,true,0); 	// run Pre-execution code

logGlobals(AInfo);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
//
//  Get the Standard choices entry we'll use for this App type
//  Then, get the action/criteria pairs for this app
//

if (doStdChoices)  {
	for (inspCount in inspIdArr) {
		inspId = inspIdArr[inspCount];
		inspType = inspTypeArr[inspCount];
		inspObj = aa.inspection.getInspection(capId,inspId).getOutput();  // current inspection object
		inspGroup = inspObj.getInspection().getInspectionGroup();
		inspSchedDate = inspObj.getScheduledDate().getMonth() + "/" + inspObj.getScheduledDate().getDayOfMonth() + "/" + inspObj.getScheduledDate().getYear();
		logDebug("Inspection #" + inspCount);
		logDebug("inspType = " + inspType);
		logDebug("inspObj = " + inspObj.getClass());
		logDebug("inspId =  " + inspIdArr[inspCount]);
		logDebug("inspGroup = " + inspGroup);
		logDebug("inspSchedDate = " + inspSchedDate);
		doStandardChoiceActions(controlString,true,0);
	}
}

//
//  Next, execute and scripts that are associated to the record type
//

if (doScripts)  {
	for (inspCount in inspIdArr) {
		inspId = inspIdArr[inspCount];
		inspType = inspTypeArr[inspCount];
		inspObj = aa.inspection.getInspection(capId,inspId).getOutput();  // current inspection object
		inspGroup = inspObj.getInspection().getInspectionGroup();
		inspSchedDate = inspObj.getScheduledDate().getMonth() + "/" + inspObj.getScheduledDate().getDayOfMonth() + "/" + inspObj.getScheduledDate().getYear();
		logDebug("Inspection #" + inspCount);
		logDebug("inspType = " + inspType);
		logDebug("inspObj = " + inspObj.getClass());
		logDebug("inspId =  " + inspIdArr[inspCount]);
		logDebug("inspGroup = " + inspGroup);
		logDebug("inspSchedDate = " + inspSchedDate);
		doScriptActions();
	}
}


//
// Check for invoicing of fees
//
if (feeSeqList.length)
	{
	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
	if (invoiceResult.getSuccess())
		logMessage("Invoicing assessed fee items is successful.");
	else
		logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
	}

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

if (debug.indexOf("**ERROR") > 0)
	{
	aa.env.setValue("ScriptReturnCode", "1");
	aa.env.setValue("ScriptReturnMessage", debug);
	}
else
	{
	aa.env.setValue("ScriptReturnCode", "0");
	if (showMessage) aa.env.setValue("ScriptReturnMessage", message);
	if (showDebug) 	aa.env.setValue("ScriptReturnMessage", debug);
	}


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/