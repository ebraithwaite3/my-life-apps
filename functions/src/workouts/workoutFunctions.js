const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

exports.echoMessage = onRequest((request, response) => {
  const input = request.body.message || request.query.message;
  logger.info("Echo called", {input});

  response.json({
    success: true,
    response: `You sent: ${input}`,
  });
});
