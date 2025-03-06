'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ERDDiagram = dynamic(() => import('../components/ERDDiagram'), {
  ssr: false,
});

interface ERDData {
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
    source_table_name: string;
    target_table_id: number;
    target_table_name: string;
    field_id: number;
    field_name: string;
  }>;
  databases?: Array<{
    id: number;
    name: string;
    workspace_id: number;
    workspace_name: string;
    has_tables?: boolean;
    table_count?: number;
  }>;
  workspaces?: Array<{
    id: number;
    name: string;
  }>;
}

export default function Home() {
  const [erdData, setErdData] = useState<ERDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('all');

  useEffect(() => {
    const fetchERDData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:8000/api/erd');
        console.log('API Response:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        setErdData(data);
        setError(null);
      } catch (e) {
        console.error('Fetch error:', e);
        setError('Error fetching ERD data: ' + (e instanceof Error ? e.message : String(e)));
        setErdData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchERDData();
  }, []);

  // Filter tables when workspace or database selection changes
  useEffect(() => {
    if (!erdData) return;
    
    let filtered = [...erdData.tables];
    
    // Filter by workspace
    if (selectedWorkspace !== 'all') {
      const workspaceId = Number(selectedWorkspace);
      filtered = filtered.filter(table => Number(table.workspace_id) === workspaceId);
    }
    
    // Filter by database
    if (selectedDatabase !== 'all') {
      const databaseId = Number(selectedDatabase);
      filtered = filtered.filter(table => Number(table.database_id) === databaseId);
    }
  }, [erdData, selectedWorkspace, selectedDatabase]);

  // Use databases directly from the backend if available
  const allDatabases = useMemo(() => {
    if (erdData?.databases && erdData.databases.length > 0) {
      return erdData.databases.map(db => {
        // Use table_count from the backend if available
        const tableCount = db.table_count !== undefined ? db.table_count : 
          erdData.tables.filter(t => Number(t.database_id) === db.id).length;
        
        // Use has_tables from the backend if available
        const hasTables = db.has_tables !== undefined ? db.has_tables : tableCount > 0;
        
        return {
          id: db.id,
          name: db.name,
          workspace_id: db.workspace_id,
          workspace_name: db.workspace_name,
          tableCount,
          hasTables
        };
      });
    }
    
    // Fallback to extracting from tables
    if (!erdData || !erdData.tables || erdData.tables.length === 0) return [];
    
    // First, collect all unique database IDs from the tables
    const uniqueDatabaseIds = new Set<number>();
    erdData.tables.forEach(table => {
      if (table.database_id) {
        uniqueDatabaseIds.add(Number(table.database_id));
      }
    });
    
    // For each unique database ID, create a database object
    const result = Array.from(uniqueDatabaseIds).map(dbId => {
      // Find a table from this database to get the name and workspace info
      const sampleTable = erdData.tables.find(t => Number(t.database_id) === dbId);
      
      // Count tables in this database
      const tableCount = erdData.tables.filter(t => Number(t.database_id) === dbId).length;
      
      return {
        id: dbId,
        name: sampleTable?.database_name || `Database ${dbId}`,
        workspace_id: Number(sampleTable?.workspace_id),
        workspace_name: sampleTable?.workspace_name || 'Unknown Workspace',
        tableCount,
        hasTables: tableCount > 0
      };
    });
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [erdData]);

  // Use workspaces directly from the backend if available
  const allWorkspaces = useMemo(() => {
    if (erdData?.workspaces && erdData.workspaces.length > 0) {
      return erdData.workspaces.map(ws => {
        // Count databases in this workspace
        const databasesInWorkspace = allDatabases.filter(db => db.workspace_id === ws.id);
        
        // Count tables in this workspace
        const tablesInWorkspace = erdData.tables.filter(t => Number(t.workspace_id) === ws.id);
        
        return {
          id: ws.id,
          name: ws.name,
          databaseCount: databasesInWorkspace.length,
          tableCount: tablesInWorkspace.length
        };
      });
    }
    
    // Fallback to extracting from tables
    if (!erdData || !erdData.tables || erdData.tables.length === 0) return [];
    
    // First, collect all unique workspace IDs from the tables
    const uniqueWorkspaceIds = new Set<number>();
    erdData.tables.forEach(table => {
      if (table.workspace_id) {
        uniqueWorkspaceIds.add(Number(table.workspace_id));
      }
    });
    
    // For each unique workspace ID, create a workspace object
    const result = Array.from(uniqueWorkspaceIds).map(wsId => {
      // Find a table from this workspace to get the name
      const sampleTable = erdData.tables.find(t => Number(t.workspace_id) === wsId);
      
      // Count databases in this workspace
      const databaseIds = new Set<number>();
      erdData.tables.forEach(table => {
        if (Number(table.workspace_id) === wsId && table.database_id) {
          databaseIds.add(Number(table.database_id));
        }
      });
      
      // Count tables in this workspace
      const tableCount = erdData.tables.filter(t => Number(t.workspace_id) === wsId).length;
      
      return {
        id: wsId,
        name: sampleTable?.workspace_name || `Workspace ${wsId}`,
        databaseCount: databaseIds.size,
        tableCount
      };
    });
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [erdData, allDatabases]);

  // Filter databases based on selected workspace
  const filteredDatabases = useMemo(() => {
    if (!allDatabases || allDatabases.length === 0) return [];
    
    if (selectedWorkspace === 'all') {
      return allDatabases;
    }
    
    const workspaceId = Number(selectedWorkspace);
    console.log(`Filtering databases for workspace ID: ${workspaceId}`);
    
    // Debug: log all databases with their workspace IDs
    allDatabases.forEach(db => {
      console.log(`Database ${db.id} (${db.name}) has workspace_id: ${db.workspace_id}`);
    });
    
    const filtered = allDatabases.filter(db => db.workspace_id === workspaceId);
    console.log(`Found ${filtered.length} databases for workspace ${workspaceId}`);
    return filtered;
  }, [allDatabases, selectedWorkspace]);

  // Filter tables based on workspace and database
  const filteredTables = useMemo(() => {
    console.log('Filtering tables...');
    console.log('Total tables:', erdData?.tables?.length || 0);
    console.log('Selected workspace:', selectedWorkspace);
    console.log('Selected database:', selectedDatabase);
    
    if (!erdData?.tables) return [];
    
    // Create a new array to avoid modifying the original
    let filtered = [...erdData.tables];
    
    // Filter by workspace first
    if (selectedWorkspace !== 'all') {
      const workspaceId = Number(selectedWorkspace);
      console.log('Filtering by workspace ID:', workspaceId);
      
      filtered = filtered.filter(table => {
        const tableWorkspaceId = Number(table.workspace_id);
        const match = tableWorkspaceId === workspaceId;
        return match;
      });
      
      console.log('Tables after workspace filter:', filtered.length);
    }
    
    // Then filter by database if selected
    if (selectedDatabase !== 'all') {
      const databaseId = Number(selectedDatabase);
      console.log('Filtering by database ID:', databaseId);
      
      // Create a new array with only tables that match the database ID
      const dbFiltered = filtered.filter(table => {
        const tableDatabaseId = Number(table.database_id);
        const match = tableDatabaseId === databaseId;
        return match;
      });
      
      filtered = dbFiltered;
      console.log('Tables after database filter:', filtered.length);
    }
    
    console.log('Final filtered tables:', filtered.map(t => t.name));
    return filtered;
  }, [erdData, selectedWorkspace, selectedDatabase]);

  // Count tables per database for the current workspace filter
  const databasesWithCorrectCounts = useMemo(() => {
    if (!erdData?.tables || !filteredDatabases) return [];
    
    return filteredDatabases.map(db => {
      // Count tables for this database
      const tableCount = erdData.tables.filter(t => Number(t.database_id) === db.id).length;
      
      return {
        ...db,
        tableCount,
        hasTables: tableCount > 0
      };
    });
  }, [erdData, filteredDatabases]);

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorkspace(e.target.value);
    setSelectedDatabase('all'); // Reset database selection when workspace changes
  };

  const handleDatabaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDatabase(e.target.value);
  };

  const handleDebug = () => {
    console.log('=== DEBUG INFO ===');
    
    // Log raw data structure
    console.log('Raw Tables Structure:');
    if (erdData?.tables && erdData.tables.length > 0) {
      const firstTable = erdData.tables[0];
      console.log('First table structure:', Object.keys(firstTable));
      console.log('First table sample:', {
        id: firstTable.id,
        name: firstTable.name,
        database_id: firstTable.database_id,
        database_name: firstTable.database_name,
        workspace_id: firstTable.workspace_id,
        workspace_name: firstTable.workspace_name
      });
    }
    
    // Count tables per database
    console.log('\nTables per Database:');
    const dbTableCounts = new Map();
    
    erdData?.tables?.forEach(table => {
      const dbId = Number(table.database_id);
      if (!dbTableCounts.has(dbId)) {
        dbTableCounts.set(dbId, {
          count: 0,
          name: table.database_name,
          tables: []
        });
      }
      const info = dbTableCounts.get(dbId);
      info.count++;
      info.tables.push(table.name);
    });
    
    dbTableCounts.forEach((info, dbId) => {
      console.log(`Database ${dbId} (${info.name}): ${info.count} tables`);
      console.log(`  Tables: ${info.tables.join(', ')}`);
    });
    
    // Log all databases from the API
    console.log('\nAll Databases from API:');
    erdData?.databases?.forEach(db => {
      console.log(`Database ${db.id} (${db.name}): Workspace: ${db.workspace_name} (${db.workspace_id})`);
    });
    
    // Log database information
    console.log('\nAll Databases with Table Counts:');
    allDatabases.forEach(db => {
      console.log(`Database ${db.id} (${db.name}): ${db.tableCount} tables, Workspace: ${db.workspace_name} (${db.workspace_id})`);
    });
    
    // Log filtered database information
    console.log('\nFiltered Databases with Table Counts:');
    databasesWithCorrectCounts.forEach(db => {
      console.log(`Database ${db.id} (${db.name}): ${db.tableCount} tables, Workspace: ${db.workspace_name} (${db.workspace_id})`);
    });
    
    // Count unique database IDs
    const uniqueDatabaseIds = new Set();
    erdData?.tables.forEach(table => {
      if (table.database_id) {
        uniqueDatabaseIds.add(Number(table.database_id));
      }
    });
    console.log(`Total unique database IDs in raw data: ${uniqueDatabaseIds.size}`);
    console.log('Unique database IDs:', Array.from(uniqueDatabaseIds));
    
    // Count unique workspace IDs
    const uniqueWorkspaceIds = new Set();
    erdData?.tables.forEach(table => {
      if (table.workspace_id) {
        uniqueWorkspaceIds.add(Number(table.workspace_id));
      }
    });
    console.log(`Total unique workspace IDs in raw data: ${uniqueWorkspaceIds.size}`);
    console.log('Unique workspace IDs:', Array.from(uniqueWorkspaceIds));
    
    // Group tables by database
    const tablesByDatabase = new Map();
    erdData?.tables.forEach(table => {
      const dbId = Number(table.database_id);
      if (!tablesByDatabase.has(dbId)) {
        tablesByDatabase.set(dbId, []);
      }
      tablesByDatabase.get(dbId).push(table.name);
    });
    
    console.log('Tables grouped by database:');
    tablesByDatabase.forEach((tables, dbId) => {
      const sampleTable = erdData?.tables.find(t => Number(t.database_id) === dbId);
      console.log(`Database ${dbId} (${sampleTable?.database_name}) - Tables: ${tables.join(', ')}`);
    });
    
    // Group databases by workspace
    const databasesByWorkspace = new Map();
    erdData?.tables.forEach(table => {
      const wsId = Number(table.workspace_id);
      const dbId = Number(table.database_id);
      
      if (!databasesByWorkspace.has(wsId)) {
        databasesByWorkspace.set(wsId, new Set());
      }
      databasesByWorkspace.get(wsId).add(dbId);
    });
    
    console.log('Databases grouped by workspace:');
    databasesByWorkspace.forEach((dbIds, wsId) => {
      const sampleTable = erdData?.tables.find(t => Number(t.workspace_id) === wsId);
      console.log(`Workspace ${wsId} (${sampleTable?.workspace_name}) - Databases: ${Array.from(dbIds).join(', ')}`);
      
      // For each database in this workspace, show the tables
      Array.from(dbIds).forEach(dbId => {
        const tablesInDb = erdData?.tables?.filter(t => Number(t.database_id) === dbId).map(t => t.name) || [];
        console.log(`  Database ${dbId} - Tables: ${tablesInDb.join(', ')}`);
      });
    });
    
    console.log('All Tables:', erdData?.tables);
    console.log('Filtered Tables:', filteredTables);
    console.log('All Databases:', allDatabases);
    console.log('Filtered Databases:', filteredDatabases);
    console.log('Databases with Correct Counts:', databasesWithCorrectCounts);
    console.log('All Workspaces:', allWorkspaces);
    console.log('Selected Workspace:', selectedWorkspace);
    console.log('Selected Database:', selectedDatabase);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Baserow ERD Viewer</h1>
            <p className="text-xl text-gray-600 mb-6">Visualize your Baserow tables as Entity-Relationship Diagrams</p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setViewMode('diagram')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'diagram'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Diagram View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                List View
              </button>
            </div>
          </div>

          {erdData && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="workspace-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace:
                  </label>
                  <select
                    id="workspace-filter"
                    value={selectedWorkspace}
                    onChange={handleWorkspaceChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Workspaces</option>
                    {allWorkspaces.map((ws) => (
                      <option key={ws.id} value={ws.id.toString()}>
                        {ws.name} ({ws.databaseCount} databases, {ws.tableCount} tables)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="database-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Database:
                  </label>
                  <select
                    id="database-filter"
                    value={selectedDatabase}
                    onChange={handleDatabaseChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={selectedWorkspace === 'all'}
                  >
                    <option value="all">All Databases</option>
                    {databasesWithCorrectCounts.map((db) => (
                      <option key={db.id} value={db.id.toString()}>
                        {db.name} ({db.tableCount} tables) {db.tableCount === 0 ? '- Empty' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 flex justify-between items-center">
                <div>
                  Showing {filteredTables.length} tables
                  {selectedWorkspace !== 'all' && (
                    <span> in workspace "{allWorkspaces.find(w => w.id.toString() === selectedWorkspace)?.name || selectedWorkspace}"</span>
                  )}
                  {selectedDatabase !== 'all' && (
                    <span> from database "{allDatabases.find(d => d.id.toString() === selectedDatabase)?.name || selectedDatabase}"</span>
                  )}
                </div>
                <button
                  onClick={handleDebug}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                >
                  Debug
                </button>
                <button
                  onClick={() => console.log(JSON.stringify(erdData, null, 2))}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded ml-2"
                >
                  Raw Data
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-700">Loading...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <p className="text-sm text-red-700 mt-2">Make sure the backend is running and you have set the correct Baserow API token.</p>
                </div>
              </div>
            </div>
          )}

          {erdData && (
            viewMode === 'diagram' ? (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <ERDDiagram 
                  tables={filteredTables} 
                  relationships={erdData.relationships}
                  hideFilters={true}
                />
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTables.map((table) => (
                    <div key={table.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-lg">
                        <h2 className="text-lg font-semibold text-gray-800">{table.name}</h2>
                        <p className="text-xs text-gray-500">Database: {table.database_name}</p>
                        <p className="text-xs text-gray-500">Workspace: {table.workspace_name}</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {table.fields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                            <span className="font-medium text-gray-700">{field.name}</span>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{field.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {erdData.relationships.length > 0 && (
                  <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Relationships</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {erdData.relationships.map((rel, index) => (
                        <div key={index} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{rel.source_table_name}</span>
                            <svg className="h-5 w-5 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="font-medium text-gray-800">{rel.target_table_name}</span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            via field: <span className="font-medium">{rel.field_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
} 