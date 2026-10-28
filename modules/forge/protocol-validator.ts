/**
 * OMNI PROTOCOL FORGE — GRAPH VALIDATOR & TOPOLOGICAL RESOLVER
 * Validates protocol graph schemas, verifies port compatibility, detects cycles, and generates execution plans.
 */

import {
  ProtocolDefinition,
  ProtocolNode,
  ProtocolConnection,
  ProtocolValidationResult,
  ProtocolValidationIssue,
  PortDataType,
} from './types';

export class ProtocolValidator {
  /**
   * Validate port type compatibility
   */
  static arePortsCompatible(fromType: PortDataType, toType: PortDataType): boolean {
    if (fromType === 'any' || toType === 'any') return true;
    return fromType === toType;
  }

  /**
   * Validates a protocol graph thoroughly.
   */
  static validate(protocol: ProtocolDefinition): ProtocolValidationResult {
    const errors: ProtocolValidationIssue[] = [];
    const warnings: ProtocolValidationIssue[] = [];

    // 1. Basic structural checks
    if (!protocol.nodes || protocol.nodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Protocol contains no nodes. Add at least one Input and one Output node.',
      });
      return { isValid: false, errors, warnings, sortedNodeIds: [] };
    }

    const nodeMap = new Map<string, ProtocolNode>();
    for (const node of protocol.nodes) {
      if (nodeMap.has(node.id)) {
        errors.push({
          type: 'error',
          nodeId: node.id,
          message: `Duplicate node ID detected: "${node.id}".`,
        });
      }
      nodeMap.set(node.id, node);
    }

    const inputNodes = protocol.nodes.filter((n) => n.category === 'INPUT');
    const outputNodes = protocol.nodes.filter((n) => n.category === 'OUTPUT');

    if (inputNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Protocol must have at least one Input node to trigger execution.',
      });
    }

    if (outputNodes.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'Protocol has no Output nodes; execution will produce no external actions or log entries.',
      });
    }

    // 2. Connection validation & port type checking
    const validConnections: ProtocolConnection[] = [];
    const connectionIds = new Set<string>();

    for (const conn of protocol.connections || []) {
      if (connectionIds.has(conn.id)) {
        warnings.push({
          type: 'warning',
          connectionId: conn.id,
          message: `Duplicate connection ID "${conn.id}".`,
        });
      }
      connectionIds.add(conn.id);

      const fromNode = nodeMap.get(conn.fromNode);
      const toNode = nodeMap.get(conn.toNode);

      if (!fromNode) {
        errors.push({
          type: 'error',
          connectionId: conn.id,
          message: `Source node "${conn.fromNode}" not found in graph.`,
        });
        continue;
      }

      if (!toNode) {
        errors.push({
          type: 'error',
          connectionId: conn.id,
          message: `Destination node "${conn.toNode}" not found in graph.`,
        });
        continue;
      }

      const outPort = fromNode.outputs.find((p) => p.id === conn.fromPort);
      const inPort = toNode.inputs.find((p) => p.id === conn.toPort);

      if (!outPort) {
        errors.push({
          type: 'error',
          connectionId: conn.id,
          nodeId: fromNode.id,
          message: `Output port "${conn.fromPort}" not found on node "${fromNode.label}".`,
        });
        continue;
      }

      if (!inPort) {
        errors.push({
          type: 'error',
          connectionId: conn.id,
          nodeId: toNode.id,
          message: `Input port "${conn.toPort}" not found on node "${toNode.label}".`,
        });
        continue;
      }

      if (!this.arePortsCompatible(outPort.type, inPort.type)) {
        errors.push({
          type: 'error',
          connectionId: conn.id,
          message: `Incompatible port types: cannot connect "${outPort.type}" (from ${fromNode.label}) to "${inPort.type}" (to ${toNode.label}).`,
        });
        continue;
      }

      validConnections.push(conn);
    }

    // 3. Cycle Detection & Topological Sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of protocol.nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const conn of validConnections) {
      inDegree.set(conn.toNode, (inDegree.get(conn.toNode) || 0) + 1);
      adjacency.get(conn.fromNode)!.push(conn.toNode);
    }

    const queue: string[] = [];
    inDegree.forEach((deg, nodeId) => {
      if (deg === 0) {
        queue.push(nodeId);
      }
    });

    const sortedNodeIds: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedNodeIds.push(u);

      for (const neighbor of adjacency.get(u) || []) {
        const nextDeg = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, nextDeg);
        if (nextDeg === 0) {
          queue.push(neighbor);
        }
      }
    }

    const hasCycle = sortedNodeIds.length < protocol.nodes.length;
    const cyclicalNodeIds = hasCycle
      ? protocol.nodes.filter((n) => !sortedNodeIds.includes(n.id)).map((n) => n.id)
      : [];

    if (hasCycle) {
      errors.push({
        type: 'error',
        message: 'Cyclic feedback loop detected in protocol graph. Cyclic workflows are disallowed to prevent runaway execution.',
      });
    }

    // 4. Check for orphaned non-input nodes
    for (const node of protocol.nodes) {
      if (node.category !== 'INPUT') {
        const incoming = validConnections.filter((c) => c.toNode === node.id);
        if (incoming.length === 0) {
          warnings.push({
            type: 'warning',
            nodeId: node.id,
            message: `Node "${node.label}" has no incoming connections and will never be activated.`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      hasCycle,
      cyclicalNodeIds,
      errors,
      warnings,
      sortedNodeIds: errors.length === 0 ? sortedNodeIds : [],
    };
  }
}
