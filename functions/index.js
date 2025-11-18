const {setGlobalOptions} = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();


setGlobalOptions({maxInstances: 10});

// Auto-load all function modules
const modules = [
  require("./src/user/userFunctions"),
  require("./src/workouts/workoutFunctions"),
  require("./src/schedules/scheduleFunctions"),
  require("./src/calendar/googleCalendarFunctions"),
  require("./src/calendar/calendarFunctions"),
  // Add more as you create them
];

modules.forEach((module) => {
  Object.assign(exports, module);
});
