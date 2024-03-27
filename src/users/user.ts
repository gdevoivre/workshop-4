import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { NodeRegistry, Node } from "../registry/registry"
import * as crypto from "../crypto";
import * as config from "../config";

// Defines the structure for the message sending request body
export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

// Structure to log user's message activities
type UserLog = {
  lastReceivedMessage: string | null;
  lastSentMessage: string | null;
  lastCircuit: number[];
  update: (message: string, circuit: Node[]) => void;
}

// Main function to initialize and handle user interactions
export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Initialize user log
  let log: UserLog = { 
    lastReceivedMessage: null,
    lastSentMessage: null,
    lastCircuit: [],
    update(message: string, circuit: Node[]) {
      // Only store the NodeId for each node in the circuit
      this.lastSentMessage = message;
      this.lastCircuit = circuit.map(circuit => circuit.nodeId);
    }
  };

  // Endpoint to check if the user service is alive
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Retrieves the last message received by the user
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: log.lastReceivedMessage });
  });

  // Retrieves the last message sent by the user
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: log.lastSentMessage });
  });

  // Retrieves the last circuit used for sending a message
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: log.lastCircuit });
  });

  // Handles receiving a new message
  _user.post("/message", (req, res) => {
    const message: string = req.body.message;
    log.lastReceivedMessage = message;
    res.send("success");
  });

  // Sends a message through the network
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId }: SendMessageBody = req.body;
    const circuit = await generateRandomCircuit();
    const encryptedMessage = await encryptMessage(message, destinationUserId, circuit);

    // Send the encrypted message to the entry node of the circuit
    const entryNode = config.BASE_ONION_ROUTER_PORT + circuit[0].nodeId;
    await axios.post(`http://localhost:${entryNode}/message`, { message: encryptedMessage });

    log.update(message, circuit);
    res.sendStatus(200);
  });

  // Start listening for requests on user-specific port
  const server = _user.listen(config.BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${config.BASE_USER_PORT + userId}`);
  });

  return server;
}

// Generates a random circuit of nodes
const generateRandomCircuit = async (): Promise<Node[]> => {
  const registry = await axios.get(`http://localhost:${config.REGISTRY_PORT}/getNodeRegistry`);
  const allNodes: Node[] = registry.data.nodes;
  const circuit: Node[] = [];

  // Ensure unique nodes in the circuit
  while (circuit.length < 3) {
    const randomIndex = Math.floor(Math.random() * allNodes.length);
    const randomNode = allNodes[randomIndex];
    if (!circuit.some(node => node.nodeId === randomNode.nodeId)) {
      circuit.push(randomNode);
    }
  }

  return circuit;
};

// Encrypts a message for sending through the network
const encryptMessage = async (message: string, destinationUserId: number, circuit: Node[]): Promise<string> => {
  let encryptedMessage = message;
  let previousValue = (config.BASE_USER_PORT + destinationUserId).toString().padStart(10, '0');

  // Encrypt message layer by layer starting from the destination back to the source
  for (let i = circuit.length - 1; i >= 0; i--) {
    const currentNode = circuit[i];
    const symKey = await crypto.createRandomSymmetricKey();
    const symKeyB64 = await crypto.exportSymKey(symKey);
    const symEncrypted = await crypto.symEncrypt(symKey, previousValue + encryptedMessage);
    const rsaEncrypted = await crypto.rsaEncrypt(symKeyB64, currentNode.pubKey);
    encryptedMessage = rsaEncrypted + symEncrypted;
    previousValue = (config.BASE_ONION_ROUTER_PORT + currentNode.nodeId).toString().padStart(10, '0');
  }

  return encryptedMessage;
};
