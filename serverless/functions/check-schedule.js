const { RRule } = require('rrule');
const { DateTime } = require('luxon');
const ParameterValidator = require(Runtime.getFunctions()['common/helpers/parameter-validator'].path);

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const requiredParameters = [
    { key: 'name', purpose: 'name of the schedule to check' }
  ];
  const parameterError = ParameterValidator.validate(context.PATH, event, requiredParameters);
  
  if (parameterError) {
    response.setStatusCode(400);
    response.setBody({ parameterError });
    callback(null, response);
    return;
  }
  
  const assetPath = '/schedules.json';
  
  const { name, simulate } = event;
  
  // load schedule data
  const openScheduleData = Runtime.getAssets()[assetPath].open;
  const scheduleData = JSON.parse(openScheduleData());
  
  const checkDate = (rule, now) => {
    // first, check the date component of the rule.
    
    // if bounds are provided, check current date against them
    if (rule.startDate) {
      const startDate = new Date(Date.parse(rule.startDate));
      
      if (now.valueOf() < startDate.valueOf()) {
        // before start date; this rule is not a match
        console.log(`Rule ${rule.name} doesn't match: before start date`, startDate);
        return false;
      }
    }
    
    if (rule.endDate) {
      const endDate = new Date(Date.parse(rule.endDate));
      
      if (now.valueOf() > endDate.valueOf()) {
        // after end date; this rule is not a match
        console.log(`Rule ${rule.name} doesn't match: after end date`, endDate);
        return false;
      }
    }
    
    if (rule.dateRRule) {
      // extract rule from settings
      const ruleOptions = RRule.parseString(rule.dateRRule);
      
      // since the rule concerns only dates, and we are only comparing to today, we only need one occurrence
      // by default, past occurrences are not returned
      ruleOptions.count = 1;
      ruleOptions.dtstart = now;
      
      const rrule = new RRule(ruleOptions);
      let matchFound = false;
      
      rrule.all().forEach(occurrence => {
        if (now.valueOf() == occurrence.valueOf()) {
          console.log(`Rule ${rule.name} occurrence matched`, occurrence)
          matchFound = true;
        }
      })
      
      if (!matchFound) {
        console.log(`Rule ${rule.name} doesn't match: no recurrence match`, ruleOptions);
        return false;
      }
    }
    
    return true;
  }
  
  const checkTime = (rule, nowTz) => {
    if (rule.startTime) {
      const startTime = DateTime.fromISO(rule.startTime);
      
      if (nowTz.hour < startTime.hour) {
        console.log(`Rule ${rule.name} doesn't match: before start hour`, startTime.hour);
        return false;
      }
      
      if (nowTz.hour == startTime.hour && nowTz.minute < startTime.minute) {
        console.log(`Rule ${rule.name} doesn't match: before start minute`, startTime.minute);
        return false;
      }
    }
    
    if (rule.endTime) {
      const endTime = DateTime.fromISO(rule.endTime);
      
      if (nowTz.hour > endTime.hour) {
        console.log(`Rule ${rule.name} doesn't match: after end hour`, endTime.hour);
        return false;
      }
      
      if (nowTz.hour == endTime.hour && nowTz.minute >= endTime.minute) {
        console.log(`Rule ${rule.name} doesn't match: after end minute`, endTime.minute);
        return false;
      }
    }
    
    return true;
  }
  
  try {
    let matchingRules = [];
    let returnData = {
      isOpen: false,
      closedReason: "closed"
    };
    
    // find schedule by name
    const schedule = scheduleData.schedules.find(schedule => schedule.name == name);
    
    if (!schedule) {
      callback(`Schedule ${name} not found`);
      return;
    }
    
    console.log('Checking schedule ' + schedule.name);
    
    // if the schedule is emergency closed, we can return immediately
    if (schedule.emergencyClose) {
      returnData.isOpen = false;
      returnData.closedReason = "emergency";
      
      console.log(`Schedule ${schedule.name} is emergency closed`);
      response.setBody(returnData);
      callback(null, response);
      return;
    }
    
    let nowTz;
    
    if (simulate) {
      // use the provided ISO 8601 formatted date/time
      nowTz = DateTime.fromISO(simulate, { setZone: schedule.timeZone })
    } else {
      // get the current date/time in the schedule's timezone
      nowTz = DateTime.utc().setZone(schedule.timeZone);
    }
    
    const now = new Date(Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day));
    
    // evaluate each schedule rule to see if it is currently matching
    schedule.rules.forEach(ruleId => {
      const rule = scheduleData.rules.find(rule => rule.id == ruleId);
      if (rule && checkDate(rule, now) && checkTime(rule, nowTz)) {
        console.log(`Rule ${rule.name} matched`, nowTz.toString());
        matchingRules.push(rule);
      }
    });
    
    const closedMatches = matchingRules.filter(rule => !rule.isOpen);
    
    // if any non-open schedule(s) match, we are closed
    if (closedMatches.length > 0) {
      returnData.isOpen = false;
      returnData.closedReason = closedMatches[0].closedReason;
    } else {
      const openMatches = matchingRules.filter(rule => rule.isOpen);
      
      // if only open schedule(s) match, we are open
      if (openMatches.length > 0) {
        returnData.isOpen = true;
        returnData.closedReason = '';
      }
    }
    
    // if nothing matches, the default returnData is used
    
    console.log(`Schedule ${schedule.name} result`, returnData);
    response.setBody(returnData);
    callback(null, response);
  } catch (error) {
    console.log('Error executing function', error)
    callback(error);
  }
};
