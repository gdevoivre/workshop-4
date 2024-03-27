import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string; prvKey?: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
  prvKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

let nodes: Node[] = []; // Stores registered nodes including their public and optionally private keys

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    // Health check route to confirm the registry is live
    res.send("live");
  });

  _registry.post("/registerNode", (req: Request<{}, {}, RegisterNodeBody>, res: Response) => {
    // Endpoint to register a new node to the registry
    const { nodeId, pubKey, prvKey } = req.body;
    const nodeExists = nodes.some(node => node.nodeId === nodeId);

    if (nodeExists) {
      res.status(409).send('Node already registered');
    } else {
      nodes.push({ nodeId, pubKey, prvKey });
      res.status(201).send('Node registered successfully');
    }
  });

  _registry.get("/getPrivateKey/:nodeId", (req: Request, res: Response) => {
    // Endpoint to retrieve a node's private key for testing purposes
    // This compromises the security but is necessary for automated testing
    const nodeId = parseInt(req.params.nodeId);
    const node = nodes.find(node => node.nodeId === nodeId);

    if (node && node.prvKey) {
      res.json({ result: node.prvKey });
    } else {
      res.status(404).send('Node or private key not found');
    }
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    // Provides the list of registered nodes to users/nodes
    res.json({ nodes: nodes.map(({ nodeId, pubKey }) => ({ nodeId, pubKey })) });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
