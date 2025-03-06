"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/applications');
        
        if (!response.ok) {
          throw new Error(`Error fetching applications: ${response.status}`);
        }
        
        const data = await response.json();
        setApplications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-indigo-600">Baserow ERD Viewer</h1>
        <p className="text-gray-600 mt-2">
          Visualize your Baserow tables as Entity-Relationship Diagrams
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <p className="mt-2">
            Make sure the backend is running and you have set the correct Baserow API token.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Baserow Databases</h2>
          {applications.length === 0 ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
              <p>No databases found. Please check your Baserow API token.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((app: any) => (
                <Link href={`/erd/${app.id}`} key={app.id} className="block">
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <h3 className="font-medium text-lg text-indigo-600">{app.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      ID: {app.id}
                    </p>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        View ERD
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 