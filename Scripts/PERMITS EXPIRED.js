/*------------------------------------------------------------------------------------------------------/
| Program: Expire Applications Batch
|
| Version 1.0 - Base Version. 
|
| 
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var debugText = "";
var showDebug = false;	
var showMessage = false;
var message = "";
var maxSeconds = 4.5 * 60;
var br = "<br>";

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
wfObjArray = null;


eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
eval(getScriptText("INCLUDES_BATCH"));
eval(getScriptText("INCLUDES_CUSTOM"));


function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";
}


batchJobID = 0;
if (batchJobResult.getSuccess())
  {
  batchJobID = batchJobResult.getOutput();
  logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
  }
else
  logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());


/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
/* test parameters 
aa.env.setValue("appGroup", "Permits");
aa.env.setValue("appTypeType", "Commercial,Residential");
aa.env.setValue("appSubType", "*");
aa.env.setValue("appCategory", "*"); 
aa.env.setValue("emailAddress", "deanna.hoops@woolpert.com");
aa.env.setValue("asiGroup", "PERMIT DATES");
aa.env.setValue("asiField", "Permit Expiration Date");
aa.env.setValue("lookAheadDays", "-1");
aa.env.setValue("daySpan", "2");
aa.env.setValue("appStatus","Issued,Reinstated");
aa.env.setValue("newAppStatus", "Expired");
*/
var appGroup = getParam("appGroup");
var appTypeType = getParam("appTypeType");			
var appSubtype = getParam("appSubType");
var appCategory = getParam("appCategory");
var emailAddress = getParam("emailAddress");		
var asiField = getParam("asiField");
var asiFieldGroup = getParam("asiGroup")
var appStatusArray = getParam("appStatus").split(",");
var lookAheadDays = getParam("lookAheadDays");
var emailTemplate = getParam("emailTemplate");
var daySpan = getParam("daySpan");
var newAppStatus = getParam("newAppStatus");
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var startJSDate = new Date();
startJSDate.setHours(0,0,0,0);
var timeExpired = false;
var useAppSpecificGroupName = false;
var showDebug = true;

var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
if (appGroup=="")
	appGroup="*";
if (appTypeType=="")
	appTypeType="*";
if (appSubtype=="")
	appSubtype="*";
if (appCategory=="")
	appCategory="*";
var appType = appGroup+"/"+appTypeType+"/"+appSubtype+"/"+appCategory;	
logDebug("appType = " + appType);


var fromDate = dateAdd(null,parseInt(lookAheadDays));
var toDate = dateAdd(null,parseInt(lookAheadDays)+parseInt(daySpan));
fromJSDate = new Date(fromDate);
toJSDate = new Date(toDate);
var dFromDate = aa.date.parseDate(fromDate);
var dToDate = aa.date.parseDate(toDate);
logDebug("fromDate: " + fromDate + "  toDate: " + toDate)

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

logDebug("Start of Job");

mainProcess();

logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");

if (emailAddress.length)
	aa.sendMail("noreply@accela.com", emailAddress, "", batchJobName + " Results", emailText);

if (showDebug) 
	aa.eventLog.createEventLog("DEBUG", "Batch Process", batchJobName, aa.date.getCurrentDate(), aa.date.getCurrentDate(),"", emailText ,batchJobID);
//aa.print(emailText);
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

function mainProcess() {
	var capFilterType = 0;
	var capFilterStatus = 0;
	var capCount = 0;

	var capResult = aa.cap.getCapIDsByAppSpecificInfoDateRange(asiFieldGroup, asiField, dFromDate, dToDate);

	if (capResult.getSuccess()) {
		myCaps = capResult.getOutput();
	}
	else { 
		logDebug("ERROR: Getting records, reason is: " + capResult.getErrorMessage()) ;
		return false
	} 

	for (myCapsXX in myCaps) {
		if (elapsed() > maxSeconds) { // only continue if time hasn't expired
			logDebug("WARNING","A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
			timeExpired = true ;
			break; 
		}

     	var thisCapId = myCaps[myCapsXX].getCapID();
   		capId = getCapId(thisCapId.getID1(), thisCapId.getID2(), thisCapId.getID3()); 
		altId = capId.getCustomID();
     	

		if (!capId) {
			logDebug("Could not get Cap ID");
			continue;
		}
		
		
		cap = aa.cap.getCap(capId).getOutput();		
		appTypeResult = cap.getCapType();	
		appTypeString = appTypeResult.toString();	
		appTypeArray = appTypeString.split("/");

		if ( !( (appGroup == "*" || appGroup.indexOf(appTypeArray[0]) >= 0) && (appTypeType == "*" || appTypeType.indexOf(appTypeArray[1]) >= 0) &&
			 (appSubtype == "*" || appSubtype.indexOf(appTypeArray[2]) >= 0) && (appCategory == "*" || appCategory.indexOf(appTypeArray[3]) >= 0) )) {
			logDebug(altId + ": skipping due to record type of " + appTypeString)
			capFilterType++;
			continue;
		}

		var capStatus = cap.getCapStatus();
		if (!exists(capStatus,appStatusArray)) {
			capFilterStatus++;
			logDebug(altId + ": skipping due to application status of " + capStatus)
			continue;
		}
		capCount++;
		logDebug(altId);
	
		resultedInspectionFound = false;
		var inspResult = aa.inspection.getInspections(capId);
		if (inspResult.getSuccess()) {
			inspArray = inspResult.getOutput();
			for (var xx in inspArray) {
				var insp = inspArray[xx];
				var inspType = "" + insp.getInspectionType();
				var inspSchDate = insp.getScheduledDate();
				var inspDocDesc = insp.getDocumentDescription();
				var inspStatus = insp.getInspectionStatus();
				if (inspDocDesc == "Insp Completed") resultedInspectionFound = true;
			}
		}
		if (resultedInspectionFound) {
			logDebug("Resulted inspections found");
			if (newAppStatus) updateAppStatus("Expired");
			if (doesTaskExist("Permit Reissuance")) {
				activateTask("Permit Reissuance");
			}
			else {
				closeWorkflow(capId);
				logDebug("Adding the Permit Reissuance task");
				addTaskBATCH("Permit Issuance", "Permit Reissuance", "P");
				editTaskDueDate("Permit Reissuance", dateAddMonths(getAppSpecific("Permit Expiration Date"), 12));
			}	
		}
		else {
			logDebug("No resulted inspections found");
			closeWorkflow(capId);
			if (newAppStatus) updateAppStatus("Expired");
		}		
	}

 	logDebug("Total CAPS qualified : " + myCaps.length);
	logDebug("Ignored due to CAP type : " + capFilterType);
	logDebug("Ignored due to status : " + capFilterStatus);
 	logDebug("Total CAPS processed: " + capCount);

}

function addTaskBATCH(sourceTaskName, newTaskName, insertTaskType) {
	// insertTaskType needs to be "N" or "P" for "Next" or "Parallel"
	var itemCap = capId;
	if (arguments.length > 3)
		itemCap = arguments[3]; // use cap ID specified in args
	if (!insertTaskType.toUpperCase().equals("P") && !insertTaskType.toUpperCase().equals("N")) {
		logDebug("WARNING: Insert Task Type must be P or N");
		return false;
	}

	var sTask;
	var tTask;

	//get the task by the task path
	var taskResult1 = aa.workflow.getTask(itemCap, sourceTaskName);
	if (taskResult1.getSuccess()) {
		tTask = taskResult1.getOutput();
	} else {
		logDebug("WARNING: Failed to get task! Path = " + sourceTaskName + ";" + taskResult1.getErrorMessage());
		return false;
	}

	//change the task name
	tTask.setTaskDescription(newTaskName);
	tTask.setDisposition("");
	tTask.setActiveFlag("Y");
	tTask.setCompleteFlag("N");
	var taskResult = aa.workflow.insertTask(tTask, insertTaskType);
	if (taskResult.getSuccess()) {
		var processId = tTask.getProcessID();
		var stepNum = tTask.getStepNumber();
		var taskResult1 = aa.workflow.getTask(itemCap, stepNum, processId);

		if (taskResult1.getSuccess()) {
			tTask = taskResult1.getOutput();
			logDebug("add task successful : inserted task name = " + tTask.getTaskDescription() + "; Process name = " + tTask.getProcessCode());
		} else {
			logDebug("WARNING: Failed to get task! Path = " + taskPath + ";" + taskResult1.getErrorMessage());
			return false;
		}

	} else {
		logDebug("WARNING: Failed to add task! Path = " + taskPath + ";" + taskResult.getErrorMessage());
		return false;
	}

	return tTask; // returns task item
} 
 





function doesTaskExist(wfstr) { // optional process name
	var useProcess = false;
	var processName = "";
	if (arguments.length == 2) 	{
		processName = arguments[1]; // subprocess
		useProcess = true;
	}
	var workflowResult = aa.workflow.getTaskItems(capId,wfstr,processName,null,null,"Y");
	if (workflowResult.getSuccess())
		wfObj = workflowResult.getOutput();
	else		{ logMessage("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage()); return false; }

	for (i in wfObj) {
		fTask = wfObj[i];
		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			return true;
	}
	return false;
}

function closeWorkflow(capId) { //optional capId

	var itemCap = capId;
	if (arguments.length > 0)
		itemCap = arguments[0];

	// closes all tasks of a workflow. DOES NOT handleDisposition.
	var taskArray = new Array();

	var workflowResult = aa.workflow.getTasks(itemCap);
 	if (workflowResult.getSuccess())
  	 	var wfObj = workflowResult.getOutput();
  	else { 
		return false; 
		}
	
	var fTask;
	var stepnumber;
	var wftask;
	
	for (i in wfObj) {
   	fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		completeFlag = fTask.getCompleteFlag();
		aa.workflow.adjustTask(itemCap,stepnumber,"N", completeFlag, null, null);
	}
}

