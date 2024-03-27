import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import axios from "axios";
import * as crypto from "../crypto";

// Type definition for logging router activity
type RouterLog = {
  lastReceivedEncryptedMessage: string | null;
  lastReceivedDecryptedMessage: string | null;
  lastMessageDestination: number | null;
  update: (message: string, clearMessage: string, prevNode: number) => void;
}

// Constants for the lengths of RSA encrypted data and the previous value
const LEN_RSA_ENCRYPTED = 344;
const LEN_PREVIOUS_VALUE = 10;

/**
 * Initializes and starts a simple onion router.
 * 
 * @param {number} nodeId - The unique identifier for the router.
 * @returns {Promise<express.Application>} - The express server instance.
 */
export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Initialize router log
  let log: RouterLog = {
    lastReceivedEncryptedMessage: null,
    lastReceivedDecryptedMessage: null,
    lastMessageDestination: null,
    update(message: string, clearMessage: string, prevNode: number) {
      this.lastReceivedEncryptedMessage = message;
      this.lastReceivedDecryptedMessage = clearMessage;
      this.lastMessageDestination = prevNode;
    }
  };

  // Endpoint to check if the router service is live
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // Endpoint for retrieving the last received encrypted message
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: log.lastReceivedEncryptedMessage });
  });

  // Endpoint for retrieving the last decrypted message
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: log.lastReceivedDecryptedMessage });
  });

  // Endpoint for retrieving the destination of the last message
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: log.lastMessageDestination });
  });

  // Automatically register this router with the registry upon startup
  await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, { nodeId: nodeId });

  // Manual registration/re-registration endpoint
  onionRouter.post("/registerNode", async (req, res) => {
    const response = await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, { nodeId: nodeId });
    res.json(response.data);
  });

  // Endpoint to get this router's private key (primarily for testing)
  onionRouter.get("/getPrivateKey", async (req, res) => {
    const response = await axios.get(`http://localhost:${REGISTRY_PORT}/getPrivateKey/${nodeId}`);
    res.json({ result: response.data.prvKey });
  });

  // Handles incoming encrypted messages
  onionRouter.post("/message", async (req, res) => {
    const message: string = req.body.message;
    const response = await axios.get(`http://localhost:${REGISTRY_PORT}/getPrivateKey/${nodeId}`);
    const prvKey = await crypto.importPrvKey(response.data.prvKey);

    // Decrypt the message
    const rsaEncrypted = message.substring(0, LEN_RSA_ENCRYPTED);
    const symEncrypted = message.substring(LEN_RSA_ENCRYPTED);
    const symKey = await crypto.rsaDecrypt(rsaEncrypted, prvKey);
    const clearData = await crypto.symDecrypt(symKey, symEncrypted);

    // Extract the destination and the decrypted message
    const previousValue = clearData.substring(0, LEN_PREVIOUS_VALUE);
    const clearMessage = clearData.substring(LEN_PREVIOUS_VALUE);
    const prevNode = parseInt(previousValue, 10);

    // Forward the decrypted message to the next node or destination
    await axios.post(`http://localhost:${prevNode}/message`, { message: clearMessage });
    log.update(message, clearMessage, prevNode);
    res.sendStatus(200);
  });

  // Start listening for requests on a specific port
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}
