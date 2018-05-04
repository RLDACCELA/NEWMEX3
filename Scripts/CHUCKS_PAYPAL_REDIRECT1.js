var myCapId = "1000";
var myUserId = "ADMIN";

var eventName = "OnlinePaymentRegister";

var useProductScript = false;
var runEvent = true;

try {
      showDebug = true;
aa.env.setValue("ScriptReturnCode", "0");
aa.env.setValue("ScriptReturnMessage", "Hello World");
    }
catch (err) {
     logDebug("a java script error occurred: " + err.message);
    }

aa.env.setValue("ScriptReturnCode", "1");
aa.env.setValue("ScriptReturnMessage", "Hello World!");
