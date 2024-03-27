import bodyParser from "body-parser";
import express from "express";
import { REGISTRY_PORT } from "../config";
import * as crypto from "../crypto";

// Defines the structure for nodes in the registry
export type Node = { nodeId: number; pubKey: string };

// Structure for private key storage (not used in the main application logic)
export type NodePri = { nodeId: number; prvKey: string | null };

// Combines public and private node information for registry management
export type NodeRegistry = { nodes: Node[]; prvkey: NodePri[] };

// Types for handling registration and retrieval requests, mainly used for testing
export type RegisterNodeBody = { nodeId: number; pubKey: string };
export type GetNodeRegistryBody = { nodes: Node[] };

// Main function to initialize the registry service
export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Initialize the registry with empty arrays for nodes and private keys
  let registry: NodeRegistry = { nodes: [], prvkey: [] };

  // Endpoint to verify the registry service is operational
  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  // Handles registration of a new node, including key pair generation
  _registry.post("/registerNode", async (req, res) => {
    const nodeId: number = parseInt(req.body.nodeId, 10);
    const keyPair = await crypto.generateRsaKeyPair();
    const publicKey: string = await crypto.exportPubKey(keyPair.publicKey);
    const privateKey: string | null = await crypto.exportPrvKey(keyPair.privateKey);

    // Add the new node's public and private key information to the registry
    registry.nodes.push({ nodeId: nodeId, pubKey: publicKey });
    registry.prvkey.push({ nodeId: nodeId, prvKey: privateKey });

    // Respond with the new node's ID and public key
    res.status(200).json({ nodeId: nodeId, pubKey: publicKey });
  });

  // Endpoint to retrieve the private key for a given node (used for testing)
  _registry.get('/getPrivateKey/:nodeId', (req, res) => {
    const ReqNodeId = parseInt(req.params.nodeId);
    const ReqNode: NodePri | undefined = registry.prvkey.find(node => node.nodeId === ReqNodeId);
    const prvKey = ReqNode?.prvKey || null;
    res.json({ nodeId: ReqNodeId, prvKey: prvKey });
  });

  // Provides the current state of the node registry
  _registry.get('/getNodeRegistry', (req, res) => {
    res.json(registry);
  });

  // Start listening for requests on the designated registry port
  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
