         /**        * <pre>        *         *  Accela Automation        *  File: ContactRelatedToPublicUserBefore.js        *         *  Accela, Inc.        *  Copyright (C): 2014        *         *  Description:        *  TODO        *         *  Notes:        * 	Id: ContactRelatedToPublicUserBefore.js 72642 2009-01-01 20:01:57Z ACHIEVO\andy.zhong          *         *  Revision History        *  <Date>,			<Who>,			<What>        *  Jun 5, 2014		andy.zhong		Initial.        *          * </pre>        */        var userSeqNbr = aa.env.getValue("PublicUserSeqNum");        var contactTypeFlag = aa.env.getValue("ContactTypeFlag");        var isFromACA = aa.env.getValue("isFromACA");        var scriptResult = aa.people.getUserAssociatedContact(userSeqNbr);        var people = aa.env.getValue("People");        var tempList = people.getAttributes();        var attr1Name = tempList.get(0).getAttributeName();        var attr1Value = tempList.get(0).getAttributeValue();        var attr2Name = tempList.get(1).getAttributeName();        var attr2Value = tempList.get(1).getAttributeValue();        if (scriptResult.getSuccess() && ((contactTypeFlag != null && "individual".equalsIgnoreCase(contactTypeFlag))                                  || (attr1Value != null && "individual".equalsIgnoreCase(attr1Value))                                  || (attr2Value != null && "individual".equalsIgnoreCase(attr2Value)))) {            var userAssociatedContacts = scriptResult.getOutput();            if (userAssociatedContacts != null && userAssociatedContacts.size() > 0) {                for (var i = 0; i < userAssociatedContacts.size(); i++) {                    var contractorPeople = userAssociatedContacts.get(i);                    if ("individual".equalsIgnoreCase(contractorPeople.getContactTypeFlag())) {                        aa.env.setValue("ScriptReturnCode", "-1");                        if ("true".equals(isFromACA)) {                            aa.env.setValue("ScriptReturnMessage", "<br/>1. An ACA public user account can only be linked to one reference contact of type 'Individual' <br/> 2. An ACA public user account can be linked to zero/many Reference contacts of type 'Organisation' <br/>3. Attribute Field 1[" + attr1Name + "]:" + attr1Value + ", Attribute Field 2[" + attr2Name + "]:" + attr2Value);                        }                        else {                            aa.env.setValue("ScriptReturnMessage", "<br/>1. A public user account can only be linked to one reference contact of type 'Individual' <br/> 2. A public user account can be linked to zero/many Reference contacts of type 'Organisation' ");                        }                    }                }            }        }        else {            aa.env.setValue("ScriptReturnCode", "0");            aa.env.setValue("ScriptReturnMessage", "Connect successfully.");        }