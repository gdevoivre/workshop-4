import express from "express";
import { BASE_USER_PORT } from "../config";
import axios from "axios";
import { createRandomSymmetricKey, exportSymKey, symEncrypt, rsaEncrypt, importPubKey } from "../crypto";


export async function user(userId: number) {
  const app = express();
  app.use(express.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  app.get("/status", (req, res) => {
    // Health check route to confirm the user server is live
    res.send("live");
  });

  app.post("/message", (req, res) => {
    // Endpoint for receiving messages. Updates the last received message.
    const { message } = req.body;
    lastReceivedMessage = message;
    console.log(`User ${userId} received message: ${message}`);
    res.send("Message received");
  });

  app.post("/sendMessage", async (req, res) => {
    // Endpoint to send a message through the onion routing network
    const { message, destinationUserId } = req.body;
    try {
      const nodeRegistry = await axios.get(`http://localhost:${BASE_USER_PORT}/getNodeRegistry`);
      const nodes = nodeRegistry.data.nodes;

      // Simplified for example purposes: selects the first three nodes for the circuit
      const circuit = nodes.slice(0, 3);
      let encryptedMessage = message;

      // Encrypt the message for each node in the circuit
      for (const node of circuit.reverse()) {
        const nodePublicKey = await importPubKey(node.pubKey);
        const symKey = await createRandomSymmetricKey();
        const symKeyBase64 = await exportSymKey(symKey);
        encryptedMessage = await symEncrypt(symKey, encryptedMessage);
        encryptedMessage = await rsaEncrypt(encryptedMessage, symKeyBase64);
      }

      // Example of sending the encrypted message to the first node in the circuit
      await axios.post(`http://localhost:${circuit[0].port}/message`, { message: encryptedMessage });
      console.log(`User ${userId} sent message: ${message}`);
      lastSentMessage = message;
      res.send("Message sent through the onion routing network");
    } catch (error) {
      console.error(`Error sending message from user ${userId}: ${error}`);
      res.status(500).send("Error sending message");
    }
  });

  const server = app.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}
