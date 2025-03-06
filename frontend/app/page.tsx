'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ERDDiagram = dynamic(() => import('../components/ERDDiagram'), {
  ssr: false,
});

interface ERDData {
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
    source_table_name: string;
    target_table_id: number;
    target_table_name: string;
    field_id: number;
    field_name: string;
  }>;
}

export default function Home() {
  const [erdData, setErdData] = useState<ERDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');

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
                <ERDDiagram tables={erdData.tables} relationships={erdData.relationships} />
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {erdData.tables.map((table) => (
                    <div key={table.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-lg">
                        <h2 className="text-lg font-semibold text-gray-800">{table.name}</h2>
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