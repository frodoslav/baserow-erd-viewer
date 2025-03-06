import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Field {
  id: number;
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
}

interface TableNodeData {
  label: string;
  fields: Field[];
}

const TableNode: React.FC<{
  data: TableNodeData;
}> = ({ data }) => {
  return (
    <div className="px-2 py-1 shadow-md rounded-md bg-white border-2 border-blue-200 min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
      
      <div className="bg-blue-500 text-white px-2 py-1 rounded-t-sm -mx-2 -mt-1 font-bold">
        {data.label}
      </div>
      
      <div className="py-2">
        {data.fields.map((field, index) => (
          <div
            key={field.id}
            className={`flex justify-between items-center py-1 ${
              index !== data.fields.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-center">
              {field.isPrimary && <span className="text-yellow-500 mr-1">🔑</span>}
              {field.isForeign && <span className="text-blue-500 mr-1">🔗</span>}
              <span className="font-medium text-sm">{field.name}</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {field.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

interface ERDDiagramProps {
  tables: Array<{
    id: number;
    name: string;
    fields: Array<{
      id: number;
      name: string;
      type: string;
      link_row_table_id?: number;
    }>;
  }>;
  relationships: Array<{
    source_table_id: number;
    target_table_id: number;
    field_name: string;
  }>;
}

export default function ERDDiagram({ tables, relationships }: ERDDiagramProps) {
  // Calculate node positions in a grid layout
  const nodes: Node[] = tables.map((table, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      id: table.id.toString(),
      type: 'tableNode',
      position: { x: col * 300 + 50, y: row * 400 + 50 },
      data: {
        label: table.name,
        fields: table.fields.map(field => ({
          ...field,
          isPrimary: field.name.toLowerCase().includes('id') && field.name.toLowerCase() === `${table.name.toLowerCase()}_id`,
          isForeign: field.type === 'link_row' || field.link_row_table_id !== undefined,
        })),
      },
    };
  });

  // Create edges for relationships
  const edges: Edge[] = relationships.map((rel, index) => ({
    id: `e${index}`,
    source: rel.source_table_id.toString(),
    target: rel.target_table_id.toString(),
    label: rel.field_name,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#2563eb' },
  }));

  const onNodeDragStop = useCallback(() => {
    // Handle node drag stop if needed
  }, []);

  return (
    <div className="w-full h-[800px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
} 