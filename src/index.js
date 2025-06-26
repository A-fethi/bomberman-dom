import { EnterNamePage } from "./entername.js";
import { startRouter } from "../framework/index.js";


const routes = {
  "/": EnterNamePage(),
};
const app = document.body;
if (!app) {
  console.error("Could not find body element to mount the app.");
} else {
  if (!window.location.hash) {
    window.location.hash = "/";
  }
  console.log("Starting router with routes:", routes);
  
  startRouter(routes, app);
}


