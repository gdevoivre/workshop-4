import axios from "axios";
import { simpleOnionRouter } from "./simpleOnionRouter";
import { REGISTRY_PORT } from "../config";

/**
 * Initializes and launches a specified number of onion routers.
 * Each onion router is started with its own server instance and registered with the central registry.
 * 
 * @param {number} n - The number of onion routers to launch.
 * @returns {Promise<http.Server[]>} - A promise that resolves with an array of server instances for the launched routers.
 */
export async function launchOnionRouters(n: number) {
  const promises = [];

  // Iterate over the desired number of routers to launch each and prepare them for registration
  for (let index = 0; index < n; index++) {
    // Initializes a new onion router server and collects the promise to register it
    const newPromise = simpleOnionRouter(index);
    promises.push(newPromise);
  }

  // Wait for all routers to be launched and registered
  const servers = await Promise.all(promises);
  return servers;
}
