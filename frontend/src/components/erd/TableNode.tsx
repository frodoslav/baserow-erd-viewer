"use client";

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface Field {
  id: number;
  name: string;
  type: string;
  primary: boolean;
}

interface Table {
  id: number;
  name: string;
  fields: Field[];
}

interface TableNodeProps {
  data: {
    table: Table;
  };
}

function TableNode({ data }: TableNodeProps) {
  const { table } = data;
  const primaryKey = table.fields.find(field => field.primary);
  
  return (
    <div className="react-flow__node-table">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: 0, background: '#4f46e5' }}
      />
      
      <div className="header">{table.name}</div>
      
      <div className="content">
        {table.fields.map((field) => (
          <div key={field.id} className="field">
            <div className="flex justify-between">
              <span className={field.primary ? 'font-bold' : ''}>
                {field.name} {field.primary && '(PK)'}
              </span>
              <span className="text-xs text-gray-500">{field.type}</span>
            </div>
          </div>
        ))}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ bottom: 0, background: '#4f46e5' }}
      />
    </div>
  );
}

export default memo(TableNode); 