const {setGlobalOptions} = require("firebase-functions");

setGlobalOptions({maxInstances: 10});

// Auto-load all function modules
const modules = [
  require("./src/user/userFunctions"),
  require("./src/workouts/workoutFunctions"),
  // Add more as you create them
];

modules.forEach((module) => {
  Object.assign(exports, module);
});
