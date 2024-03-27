import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import axios from "axios";
import * as Crypto from "../crypto"; // Corrected import statement

export async function simpleOnionRouter(nodeId: number) {
  const app = express();
  app.use(express.json());
  app.use(bodyParser.json());

  // RSA key pair generation for the node using the corrected namespace
  const { publicKey, privateKey } = await Crypto.generateRsaKeyPair();
  const publicKeyBase64 = await Crypto.exportPubKey(publicKey);
  let privateKeyBase64 = await Crypto.exportPrvKey(privateKey);

  // Registering the node with the registry upon startup
  axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT}/registerNode`, {
    nodeId: nodeId,
    pubKey: publicKeyBase64,
    prvKey: privateKeyBase64
  }).then(response => console.log(`Node ${nodeId} registered`))
    .catch(error => console.error(`Error registering node ${nodeId}: ${error}`));

  app.get("/status", (req, res) => {
    // Health check route
    res.send("live");
  });

  app.post("/message", async (req, res) => {
    // Handles encrypted messages, decrypts them, and forwards to the next destination
    const { message } = req.body;
    try {
      const privateKey = await Crypto.importPrvKey(privateKeyBase64!);
      const decryptedMessage = await Crypto.rsaDecrypt(message, privateKey);
      // Forwarding logic would go here
      console.log(`Node ${nodeId} decrypted message: ${decryptedMessage}`);
      res.status(200).send({ message: "Message processed" });
    } catch (error) {
      console.error(`Error processing message at node ${nodeId}: ${error}`);
      res.status(500).send("Error processing message");
    }
  });

  const server = app.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}