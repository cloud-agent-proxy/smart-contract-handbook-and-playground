import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useEffect } from 'react';

import '@xyflow/react/dist/style.css';
import '@/styles/reactflow-overrides.css';

import type { FlowNodeDef, FlowEdgeDef } from '@/data/types';
import { useElkLayout } from './useElkLayout';

import ContractNode from './nodes/ContractNode';
import FunctionNode from './nodes/FunctionNode';
import UserNode from './nodes/UserNode';
import ProxyNode from './nodes/ProxyNode';
import StorageNode from './nodes/StorageNode';
import TokenFlowNode from './nodes/TokenFlowNode';
import AnimatedEdge from './edges/AnimatedEdge';
import LabeledEdge from './edges/LabeledEdge';
import FundFlowEdge from './edges/FundFlowEdge';

// Custom node and edge type registries — defined once outside render to avoid
// React Flow's referential equality check re-mounting nodes on every render.
const NODE_TYPES = {
  contract: ContractNode,
  function: FunctionNode,
  user: UserNode,
  proxy: ProxyNode,
  storage: StorageNode,
  tokenFlow: TokenFlowNode,
} as const;

const EDGE_TYPES = {
  animated: AnimatedEdge,
  labeled: LabeledEdge,
  fundFlow: FundFlowEdge,
} as const;

// Stable empty arrays to avoid new-reference-per-render triggering useEffect loops
const EMPTY_STRINGS: string[] = [];

// ─── Inner canvas (must live inside ReactFlowProvider) ───────────────────────

interface FlowCanvasInnerProps {
  layoutNodes: Node[];
  layoutEdges: Edge[];
  isLayouting: boolean;
  description: string;
  highlightedNodes?: string[];
  highlightedEdges?: string[];
}

function FlowCanvasInner({
  layoutNodes,
  layoutEdges,
  isLayouting,
  description,
  highlightedNodes = EMPTY_STRINGS,
  highlightedEdges = EMPTY_STRINGS,
}: FlowCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layoutEdges);
  const { fitView } = useReactFlow();

  // Sync layout results into React Flow state and fit the view once ready
  useEffect(() => {
    if (!isLayouting && layoutNodes.length > 0) {
      setNodes(layoutNodes);
      setEdges(layoutEdges);
      // fitView after a microtask so nodes have been committed to the DOM
      requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: 400 });
      });
    }
  }, [isLayouting, layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  // Apply simulation highlights to nodes and edges
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: highlightedNodes.includes(n.id),
        },
      })),
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          highlighted: highlightedEdges.includes(e.id),
        },
      })),
    );
  }, [highlightedNodes, highlightedEdges, setNodes, setEdges]);

  return (
    <div
      className="relative w-full h-full"
      style={{ background: 'var(--erc-color-bg-primary)' }}
    >
      {/* Loading overlay */}
      {isLayouting && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ background: 'var(--erc-color-bg-primary)' }}
          aria-live="polite"
          aria-label="Computing layout…"
        >
          <div className="flex flex-col items-center gap-3">
            {/* Spinner */}
            <svg
              className="animate-spin"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="var(--erc-color-node-border)"
                strokeWidth="3"
              />
              <path
                d="M16 4 A12 12 0 0 1 28 16"
                stroke="var(--erc-color-accent)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                color: 'var(--erc-color-text-secondary)',
                fontFamily: 'var(--erc-font-body)',
                fontSize: '0.875rem',
              }}
            >
              Computing layout…
            </span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: false }}
        aria-label={description}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--erc-color-node-border)"
        />
        <Controls
          aria-label="Flow diagram controls"
          style={{
            background: 'var(--erc-color-bg-secondary)',
            border: '1px solid var(--erc-color-border)',
            borderRadius: '0.5rem',
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            switch (n.type) {
              case 'contract':
                return 'var(--erc-color-accent)';
              case 'function':
                return 'var(--erc-color-fn-read)';
              case 'user':
                return 'var(--erc-color-category-account)';
              case 'proxy':
                return 'var(--erc-color-category-proxy)';
              case 'storage':
                return 'var(--erc-color-category-defi)';
              case 'tokenFlow':
                return 'var(--erc-color-category-token)';
              default:
                return 'var(--erc-color-node-border)';
            }
          }}
          maskColor="var(--erc-color-bg-primary)"
          style={{
            background: 'var(--erc-color-bg-secondary)',
            border: '1px solid var(--erc-color-border)',
            borderRadius: '0.5rem',
          }}
          aria-label="Flow diagram minimap"
        />
      </ReactFlow>
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export interface FlowCanvasProps {
  flowNodes: FlowNodeDef[];
  flowEdges: FlowEdgeDef[];
  elkLayoutOptions?: Record<string, string>;
  /** Accessible description of what the diagram shows */
  description?: string;
  /** Node IDs to highlight during simulation */
  highlightedNodes?: string[];
  /** Edge IDs to highlight during simulation */
  highlightedEdges?: string[];
}

export default function FlowCanvas({
  flowNodes,
  flowEdges,
  elkLayoutOptions,
  description = 'Smart contract interaction flow diagram',
  highlightedNodes,
  highlightedEdges,
}: FlowCanvasProps) {
  const { nodes, edges, isLayouting } = useElkLayout(
    flowNodes,
    flowEdges,
    elkLayoutOptions,
  );

  return (
    <ReactFlowProvider>
      <FlowCanvasInner
        layoutNodes={nodes}
        layoutEdges={edges}
        isLayouting={isLayouting}
        description={description}
        highlightedNodes={highlightedNodes}
        highlightedEdges={highlightedEdges}
      />
    </ReactFlowProvider>
  );
}
