import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
  NodeTypes,
  ReactFlowProvider,
  OnNodesChange,
  applyNodeChanges,
  Panel,
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

const TableNode = React.memo(({ data }: { data: TableNodeData }) => {
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
});

TableNode.displayName = 'TableNode';

const nodeTypes = {
  tableNode: TableNode,
} as NodeTypes;

interface ERDDiagramProps {
  tables: Array<{
    id: number;
    name: string;
    database_id: number;
    database_name: string;
    workspace_id: number;
    workspace_name: string;
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
  hideFilters?: boolean;
}

function WorkspaceAndDatabaseFilter({ 
  workspaces,
  databases, 
  tables,
  selectedWorkspace,
  selectedDatabase, 
  onWorkspaceChange,
  onDatabaseChange,
  tableCount,
  onDebug 
}: { 
  workspaces: Array<{ id: number; name: string }>;
  databases: Array<{ id: number; name: string; tableCount: number; workspace_id: number }>;
  tables: Array<any>;
  selectedWorkspace: string;
  selectedDatabase: string;
  onWorkspaceChange: (value: string) => void;
  onDatabaseChange: (value: string) => void;
  tableCount: number;
  onDebug: () => void;
}) {
  // Filter databases based on selected workspace
  const filteredDatabases = selectedWorkspace === 'all' 
    ? databases
    : databases.filter(db => db.workspace_id === Number(selectedWorkspace));

  return (
    <div className="flex flex-col gap-2 bg-white p-3 rounded shadow">
      <div className="flex items-center gap-2">
        <label htmlFor="workspace-filter" className="text-sm font-medium text-gray-700">
          Workspace:
        </label>
        <select
          id="workspace-filter"
          value={selectedWorkspace}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          className="form-select text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Workspaces</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id.toString()}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="database-filter" className="text-sm font-medium text-gray-700">
          Database:
        </label>
        <select
          id="database-filter"
          value={selectedDatabase}
          onChange={(e) => onDatabaseChange(e.target.value)}
          className="form-select text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={selectedWorkspace === 'all'}
        >
          <option value="all">All Databases</option>
          {filteredDatabases.map((db) => (
            <option key={db.id} value={db.id.toString()}>
              {db.name} ({db.tableCount} tables)
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-600">
          Showing {tableCount} tables
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onDebug}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium rounded"
          >
            Debug
          </button>
          <button
            onClick={() => console.log(JSON.stringify(databases, null, 2))}
            className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded"
          >
            Show Databases
          </button>
          <button
            onClick={() => console.log(JSON.stringify(tables, null, 2))}
            className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium rounded"
          >
            Show Tables
          </button>
        </div>
      </div>
    </div>
  );
}

function ERDDiagramInner({ tables, relationships, hideFilters = false }: ERDDiagramProps) {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<string>('all');
  const [selectedDatabase, setSelectedDatabase] = React.useState<string>('all');

  // Extract unique workspaces
  const workspaces = useMemo(() => {
    const workspaceMap = new Map();
    tables.forEach(table => {
      const workspace = {
        id: table.workspace_id,
        name: table.workspace_name
      };
      workspaceMap.set(workspace.id, workspace);
    });
    return Array.from(workspaceMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tables]);

  // Extract unique databases
  const databases = useMemo(() => {
    const databaseMap = new Map<number, {
      id: number;
      name: string;
      workspace_id: number;
      tableCount: number;
    }>();
    
    tables.forEach(table => {
      const dbId = Number(table.database_id);
      if (!databaseMap.has(dbId)) {
        databaseMap.set(dbId, {
          id: dbId,
          name: table.database_name,
          workspace_id: Number(table.workspace_id),
          tableCount: tables.filter(t => Number(t.database_id) === dbId).length
        });
      }
    });
    
    return Array.from(databaseMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tables]);

  // Filter tables based on workspace and database
  const filteredTables = useMemo(() => {
    console.log('Filtering tables...');
    console.log('Total tables:', tables.length);
    console.log('Selected workspace:', selectedWorkspace);
    console.log('Selected database:', selectedDatabase);
    
    // Create a new array to avoid modifying the original
    let filtered = [...tables];
    
    // Filter by workspace first
    if (selectedWorkspace !== 'all') {
      const workspaceId = Number(selectedWorkspace);
      console.log('Filtering by workspace ID:', workspaceId);
      
      filtered = filtered.filter(table => {
        const tableWorkspaceId = Number(table.workspace_id);
        const match = tableWorkspaceId === workspaceId;
        console.log(`Table ${table.name} - workspace_id: ${tableWorkspaceId} - match: ${match}`);
        return match;
      });
      
      console.log('Tables after workspace filter:', filtered.length);
      console.log('Tables after workspace filter:', filtered.map(t => t.name));
    }
    
    // Then filter by database if selected
    if (selectedDatabase !== 'all') {
      const databaseId = Number(selectedDatabase);
      console.log('Filtering by database ID:', databaseId);
      
      // Create a new array with only tables that match the database ID
      const dbFiltered = [];
      
      for (const table of filtered) {
        const tableDatabaseId = Number(table.database_id);
        const match = tableDatabaseId === databaseId;
        console.log(`Table ${table.name} - database_id: ${tableDatabaseId} - match: ${match}`);
        
        if (match) {
          dbFiltered.push(table);
        }
      }
      
      filtered = dbFiltered;
      console.log('Tables after database filter:', filtered.length);
      console.log('Tables after database filter:', filtered.map(t => t.name));
    }
    
    console.log('Final filtered tables:', filtered.map(t => t.name));
    return filtered;
  }, [tables, selectedWorkspace, selectedDatabase]);

  const handleWorkspaceChange = useCallback((value: string) => {
    console.log('Selected workspace:', value);
    setSelectedWorkspace(value);
    setSelectedDatabase('all'); // Reset database selection when workspace changes
  }, []);

  const handleDatabaseChange = useCallback((value: string) => {
    console.log('Selected database:', value);
    setSelectedDatabase(value);
  }, []);

  const handleDebug = useCallback(() => {
    console.log('\n=== DETAILED DEBUG INFO ===');
    
    // Log all tables with their database and workspace IDs
    console.log('\nAll Tables with IDs:');
    tables.forEach(table => {
      console.log(`Table: ${table.name}`);
      console.log(`  - Database ID: ${table.database_id} (${typeof table.database_id}) - ${table.database_name}`);
      console.log(`  - Workspace ID: ${table.workspace_id} (${typeof table.workspace_id}) - ${table.workspace_name}`);
      console.log(`  - Fields: ${table.fields.length}`);
    });
    
    // Log all databases with their tables
    console.log('\nAll Databases with Tables:');
    const databaseMap = new Map();
    tables.forEach(table => {
      const dbId = Number(table.database_id);
      if (!databaseMap.has(dbId)) {
        databaseMap.set(dbId, {
          id: dbId,
          name: table.database_name,
          workspace_id: Number(table.workspace_id),
          workspace_name: table.workspace_name,
          tables: []
        });
      }
      databaseMap.get(dbId).tables.push(table.name);
    });
    
    Array.from(databaseMap.values()).forEach(db => {
      console.log(`Database: ${db.name} (ID: ${db.id})`);
      console.log(`  - Workspace: ${db.workspace_name} (ID: ${db.workspace_id})`);
      console.log(`  - Tables (${db.tables.length}): ${db.tables.join(', ')}`);
    });

    console.log('\nSelected Workspace:', selectedWorkspace, typeof selectedWorkspace);
    console.log('Selected Database:', selectedDatabase, typeof selectedDatabase);
    console.log('Filtered Tables:', filteredTables.map(t => t.name));
    
    // Check for type mismatches
    if (selectedDatabase !== 'all') {
      const databaseId = Number(selectedDatabase);
      console.log('\nChecking for type mismatches with database ID:', databaseId);
      tables.forEach(table => {
        const tableDatabaseId = Number(table.database_id);
        console.log(`Table ${table.name} - database_id: ${table.database_id} (${typeof table.database_id})`);
        console.log(`  Comparison result: ${tableDatabaseId === databaseId}`);
        console.log(`  Numeric comparison: ${tableDatabaseId} === ${databaseId}`);
      });
    }
  }, [tables, selectedWorkspace, selectedDatabase, filteredTables]);

  // Filter relationships based on filtered tables
  const filteredRelationships = useMemo(() => {
    const tableIds = new Set(filteredTables.map(table => table.id));
    return relationships.filter(
      rel => tableIds.has(rel.source_table_id) && tableIds.has(rel.target_table_id)
    );
  }, [relationships, filteredTables]);

  // Initialize nodes and edges
  React.useEffect(() => {
    const initialNodes = filteredTables.map((table, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      return {
        id: table.id.toString(),
        type: 'tableNode',
        position: { x: col * 300 + 50, y: row * 400 + 50 },
        data: {
          label: `${table.name}`,
          fields: table.fields.map(field => ({
            ...field,
            isPrimary: field.name.toLowerCase().includes('id') && field.name.toLowerCase() === `${table.name.toLowerCase()}_id`,
            isForeign: field.type === 'link_row' || field.link_row_table_id !== undefined,
          })),
        },
        style: {
          width: 'auto',
          height: 'auto',
        },
        draggable: true,
      };
    });

    const initialEdges = filteredRelationships.map((rel, index) => ({
      id: `e${index}`,
      source: rel.source_table_id.toString(),
      target: rel.target_table_id.toString(),
      label: rel.field_name,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2563eb' },
      labelStyle: { fill: '#2563eb', fontWeight: 500 },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [filteredTables, filteredRelationships]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  return (
    <div className="w-full h-[800px] bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        {!hideFilters && (
          <Panel position="top-left">
            <WorkspaceAndDatabaseFilter
              workspaces={workspaces}
              databases={databases}
              tables={tables}
              selectedWorkspace={selectedWorkspace}
              selectedDatabase={selectedDatabase}
              onWorkspaceChange={handleWorkspaceChange}
              onDatabaseChange={handleDatabaseChange}
              tableCount={filteredTables.length}
              onDebug={handleDebug}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default function ERDDiagram(props: ERDDiagramProps) {
  return (
    <ReactFlowProvider>
      <ERDDiagramInner {...props} />
    </ReactFlowProvider>
  );
} 