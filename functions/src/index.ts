import * as functions from "firebase-functions";
import Crawler from "./crawler";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

export const startCrawler = functions
  .runWith({
    memory: "2GB",
    timeoutSeconds: 120,
  })
  .https.onRequest(async (request, response) => {
    functions.logger.info("Start Crawler", { structuredData: true });
    const crawler = new Crawler();
    await crawler.start();
    response.send("End Crawler");
  });

// create scheuler
export const scheduleFunctionCronTab = functions
  .runWith({
    memory: "2GB",
    timeoutSeconds: 120,
  })
  .pubsub.schedule("* 3 * * *")
  .timeZone("America/Vancouver")
  .onRun(async () => {
    functions.logger.info("Start Crawler", { structuredData: true });
    const crawler = new Crawler();
    await crawler.start();
    return null;
  });
