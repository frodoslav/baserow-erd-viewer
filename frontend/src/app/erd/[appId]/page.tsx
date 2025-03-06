"use client";

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useRouter } from 'next/navigation';
import TableNode from '@/components/erd/TableNode';

// Register custom node types
const nodeTypes = {
  table: TableNode,
};

export default function ERDPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load ERD data on component mount
  useEffect(() => {
    const fetchERDData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/erd');
        
        if (!response.ok) {
          throw new Error(`Error fetching ERD data: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Find the selected application
        const selectedApp = data.applications.find((app: any) => app.id.toString() === appId);
        
        if (!selectedApp) {
          throw new Error(`Application with ID ${appId} not found`);
        }
        
        setAppName(selectedApp.name);
        
        // Transform tables into nodes
        const flowNodes = selectedApp.tables.map((table: any, index: number) => {
          const position = {
            x: 200 + (index % 3) * 300,
            y: 100 + Math.floor(index / 3) * 300
          };
          
          return {
            id: table.id.toString(),
            type: 'table',
            position,
            data: { table }
          };
        });
        
        // Transform relationships into edges
        const flowEdges = data.relationships
          .filter((rel: any) => {
            // Only include relationships for tables in this application
            const sourceTableExists = selectedApp.tables.some((t: any) => t.id === rel.source_table_id);
            const targetTableExists = selectedApp.tables.some((t: any) => t.id === rel.target_table_id);
            return sourceTableExists && targetTableExists;
          })
          .map((rel: any, index: number) => ({
            id: `e-${index}`,
            source: rel.source_table_id.toString(),
            target: rel.target_table_id.toString(),
            label: rel.field_name,
            type: 'default',
            animated: true,
            style: { stroke: '#4f46e5' }
          }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (appId) {
      fetchERDData();
    }
  }, [appId, setNodes, setEdges]);

  const onSaveDiagram = useCallback(() => {
    // This would save the diagram layout
    alert('Save diagram feature coming soon!');
  }, []);

  return (
    <div className="w-full h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <button 
              onClick={() => router.push('/')} 
              className="text-indigo-600 hover:text-indigo-800"
            >
              &larr; Back to Databases
            </button>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">
              {loading ? 'Loading...' : appName}
            </h1>
          </div>
          <button
            onClick={onSaveDiagram}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Save Diagram
          </button>
        </div>
      </header>
      
      <div className="flex-1 w-full h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded max-w-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="bg-white p-2 rounded shadow-md">
              <h3 className="text-sm font-medium text-gray-700">Legend</h3>
              <div className="text-xs text-gray-600 mt-1">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                  <span>Table</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-0.5 bg-indigo-500 mr-2"></div>
                  <span>Relationship</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>
    </div>
  );
} 