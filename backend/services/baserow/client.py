import requests
from typing import Dict, List, Any, Optional
import os
from dotenv import load_dotenv
import json

load_dotenv()

class BaserowClient:
    """
    A client for interacting with the Baserow API using JWT authentication.
    """
    
    def __init__(self, api_url: str = None, email: str = None, password: str = None):
        """
        Initialize the Baserow client with JWT authentication.
        
        Args:
            api_url: The URL of the Baserow API
            email: Baserow account email
            password: Baserow account password
        """
        self.api_url = api_url or os.getenv("BASEROW_API_URL", "https://api.baserow.io/api")
        self.email = email or os.getenv("BASEROW_EMAIL")
        self.password = password or os.getenv("BASEROW_PASSWORD")
        
        if not all([self.email, self.password]):
            raise ValueError("Baserow email and password are required")
        
        tokens = self._get_initial_tokens()
        self.jwt_token = tokens["token"]
        self.refresh_token = tokens.get("refresh")
        print(f"Initialized Baserow client with API URL: {self.api_url}")
    
    def _get_initial_tokens(self) -> Dict[str, str]:
        """
        Get initial JWT token by authenticating with email and password.
        """
        auth_url = f"{self.api_url}/user/token-auth/"
        payload = {
            "email": self.email,
            "password": self.password
        }
        
        try:
            response = requests.post(auth_url, json=payload)
            print(f"Auth response status: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                return {
                    "token": token_data["access_token"]
                }
            else:
                print(f"Authentication failed: {response.text}")
                raise Exception("Failed to get JWT token")
        except Exception as e:
            print(f"Error during authentication: {str(e)}")
            raise

    def _refresh_token(self) -> None:
        """
        Get a new JWT token by re-authenticating.
        """
        tokens = self._get_initial_tokens()
        self.jwt_token = tokens["token"]
        self.refresh_token = tokens["refresh"]
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Get the headers for API requests, including JWT authentication.
        """
        return {
            "Authorization": f"JWT {self.jwt_token}"
        }
    
    def _handle_auth_error(self, response: requests.Response, retry_func: callable, *args, **kwargs):
        """
        Handle 401 authentication errors by refreshing token and retrying.
        """
        if response.status_code == 401:
            print("JWT token expired. Refreshing token...")
            self._refresh_token()
            return retry_func(*args, **kwargs)
        return response
    
    def get_all_databases(self) -> List[Dict[str, Any]]:
        """
        Get all databases from all workspaces.
        """
        try:
            # Get workspaces
            workspaces_url = f"{self.api_url}/workspaces/"
            print(f"Fetching workspaces from: {workspaces_url}")
            response = requests.get(workspaces_url, headers=self._get_headers())
            response.raise_for_status()
            workspaces = response.json()
            print(f"Found {len(workspaces)} workspaces")

            all_databases = []
            # Get databases for each workspace
            for workspace in workspaces:
                try:
                    workspace_id = workspace["id"]
                    databases_url = f"{self.api_url}/applications/workspace/{workspace_id}/"
                    print(f"Fetching databases for workspace {workspace_id}")
                    
                    databases_response = requests.get(databases_url, headers=self._get_headers())
                    databases_response.raise_for_status()
                    databases = databases_response.json()
                    
                    # Filter database type applications
                    for db in databases:
                        if isinstance(db, dict) and db.get("type") == "database":
                            print(f"Found database: {db.get('name', 'Unnamed')} (ID: {db.get('id')})")
                            all_databases.append(db)
                except Exception as e:
                    print(f"Error processing workspace {workspace_id}: {str(e)}")
                    continue

            print(f"Total databases found: {len(all_databases)}")
            return all_databases
        except Exception as e:
            print(f"Error in get_all_databases: {str(e)}")
            raise
    
    def get_database_schema(self, database_id: int) -> Optional[Dict[str, Any]]:
        """
        Get schema (tables and fields) for a specific database.
        """
        try:
            print(f"Getting schema for database {database_id}")
            tables_url = f"{self.api_url}/database/tables/database/{database_id}/"
            response = requests.get(tables_url, headers=self._get_headers())
            response.raise_for_status()
            tables = response.json()
            print(f"Found {len(tables)} tables in database {database_id}")

            schema = {"tables": []}
            for table in tables:
                try:
                    table_id = table["id"]
                    print(f"Processing table {table_id}")
                    fields_url = f"{self.api_url}/database/fields/table/{table_id}/"
                    fields_response = requests.get(fields_url, headers=self._get_headers())
                    fields_response.raise_for_status()
                    fields = fields_response.json()
                    
                    table_info = {
                        "id": table_id,
                        "name": table["name"],
                        "fields": fields
                    }
                    schema["tables"].append(table_info)
                except Exception as e:
                    print(f"Error processing table {table_id}: {str(e)}")
                    continue

            return schema
        except Exception as e:
            print(f"Error in get_database_schema: {str(e)}")
            return None
    
    def get_erd_data(self) -> Dict[str, Any]:
        """
        Get all data needed for creating an ERD.
        """
        try:
            print("Starting ERD data collection")
            databases = self.get_all_databases()
            all_tables = []
            all_relationships = []

            for database in databases:
                try:
                    database_id = database["id"]
                    print(f"Processing database {database_id}")
                    schema = self.get_database_schema(database_id)
                    
                    if schema and "tables" in schema:
                        for table in schema["tables"]:
                            all_tables.append(table)
                            
                            # Process relationships
                            for field in table["fields"]:
                                if field.get("type") == "link_row":
                                    relationship = {
                                        "source_table_id": table["id"],
                                        "source_table_name": table["name"],
                                        "target_table_id": field.get("link_row_table_id"),
                                        "target_table_name": field.get("link_row_table", {}).get("name", "Unknown"),
                                        "field_id": field["id"],
                                        "field_name": field["name"]
                                    }
                                    all_relationships.append(relationship)
                except Exception as e:
                    print(f"Error processing database {database_id}: {str(e)}")
                    continue

            print(f"Finished collecting ERD data: {len(all_tables)} tables, {len(all_relationships)} relationships")
            return {
                "tables": all_tables,
                "relationships": all_relationships
            }
        except Exception as e:
            print(f"Error in get_erd_data: {str(e)}")
            raise
