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
    
    def get_database_schema(self, database_id: int, workspace_id: int, workspace_name: str) -> Optional[Dict[str, Any]]:
        """
        Get schema (tables and fields) for a specific database.
        """
        try:
            print(f"Getting schema for database {database_id}")
            tables_url = f"{self.api_url}/database/tables/database/{database_id}/"
            print(f"Tables URL: {tables_url}")
            
            response = requests.get(tables_url, headers=self._get_headers())
            print(f"Tables response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"Error response: {response.text}")
                return {"tables": []}
            
            response.raise_for_status()
            tables = response.json()
            print(f"Found {len(tables)} tables in database {database_id}")

            # Get database details to get the proper name
            database_url = f"{self.api_url}/applications/{database_id}/"
            try:
                db_response = requests.get(database_url, headers=self._get_headers())
                db_response.raise_for_status()
                database_details = db_response.json()
                database_name = database_details.get("name", f"Database {database_id}")
                print(f"Database name: {database_name}")
            except Exception as e:
                print(f"Error getting database details: {str(e)}")
                database_name = f"Database {database_id}"

            schema = {"tables": []}
            for table in tables:
                try:
                    if not isinstance(table, dict):
                        print(f"Skipping table: not a dictionary: {table}")
                        continue
                    
                    table_id = int(table["id"])
                    print(f"Processing table {table_id}")
                    fields_url = f"{self.api_url}/database/fields/table/{table_id}/"
                    fields_response = requests.get(fields_url, headers=self._get_headers())
                    fields_response.raise_for_status()
                    fields = fields_response.json()
                    
                    # Process fields to ensure they're all dictionaries
                    processed_fields = []
                    for field in fields:
                        if isinstance(field, dict):
                            processed_fields.append(field)
                        else:
                            print(f"Skipping field: not a dictionary: {field}")
                    
                    table_info = {
                        "id": table_id,
                        "name": table["name"],
                        "database_id": int(database_id),
                        "database_name": database_name,
                        "workspace_id": int(workspace_id),
                        "workspace_name": workspace_name,
                        "fields": processed_fields
                    }
                    schema["tables"].append(table_info)
                except Exception as e:
                    print(f"Error processing table {table.get('id', 'unknown') if isinstance(table, dict) else table}: {str(e)}")
                    continue

            return schema
        except Exception as e:
            print(f"Error in get_database_schema: {str(e)}")
            return {"tables": []}
    
    def get_erd_data(self) -> Dict[str, Any]:
        """
        Get all data needed for creating an ERD.
        """
        try:
            print("Starting ERD data collection")
            workspaces_url = f"{self.api_url}/workspaces/"
            print(f"Fetching workspaces from: {workspaces_url}")
            workspaces_response = requests.get(workspaces_url, headers=self._get_headers())
            workspaces_response.raise_for_status()
            workspaces = workspaces_response.json()
            print(f"Found {len(workspaces)} workspaces")

            all_tables = []
            all_relationships = []
            all_databases = []

            for workspace in workspaces:
                try:
                    workspace_id = int(workspace["id"])
                    workspace_name = workspace["name"]
                    print(f"\nProcessing workspace: {workspace_name} (ID: {workspace_id})")

                    # Get databases for this workspace
                    databases_url = f"{self.api_url}/applications/workspace/{workspace_id}/"
                    databases_response = requests.get(databases_url, headers=self._get_headers())
                    databases_response.raise_for_status()
                    databases = databases_response.json()

                    # Filter database type applications
                    databases = [db for db in databases if isinstance(db, dict) and db.get("type") == "database"]
                    print(f"Found {len(databases)} databases in workspace {workspace_name}")

                    # Add all databases to the list, even if they have no tables
                    for database in databases:
                        try:
                            database_id = int(database["id"])
                            database_name = database["name"]
                            
                            print(f"\nProcessing database: {database_name} (ID: {database_id})")
                            
                            # Try to get tables for this database
                            try:
                                # First, try the standard tables endpoint
                                tables_url = f"{self.api_url}/database/tables/database/{database_id}/"
                                print(f"Trying tables URL: {tables_url}")
                                tables_response = requests.get(tables_url, headers=self._get_headers())
                                
                                if tables_response.status_code != 200:
                                    print(f"Error response from tables endpoint: {tables_response.text}")
                                    # Try alternative endpoint for database tables
                                    tables_url = f"{self.api_url}/database/{database_id}/tables/"
                                    print(f"Trying alternative tables URL: {tables_url}")
                                    tables_response = requests.get(tables_url, headers=self._get_headers())
                                
                                tables_response.raise_for_status()
                                tables = tables_response.json()
                                table_count = len(tables)
                                print(f"Found {table_count} tables in database {database_id}")
                                
                                # Process each table
                                database_tables = []
                                for table in tables:
                                    try:
                                        table_id = int(table["id"])
                                        print(f"Processing table {table_id}")
                                        fields_url = f"{self.api_url}/database/fields/table/{table_id}/"
                                        fields_response = requests.get(fields_url, headers=self._get_headers())
                                        fields_response.raise_for_status()
                                        fields = fields_response.json()
                                        
                                        table_info = {
                                            "id": table_id,
                                            "name": table["name"],
                                            "database_id": database_id,
                                            "database_name": database_name,
                                            "workspace_id": workspace_id,
                                            "workspace_name": workspace_name,
                                            "fields": fields
                                        }
                                        database_tables.append(table_info)
                                        
                                        # Process relationships
                                        for field in fields:
                                            if isinstance(field, dict) and field.get("type") == "link_row":
                                                try:
                                                    # Ensure we have all required fields and they're the right type
                                                    link_row_table_id = field.get("link_row_table_id")
                                                    if link_row_table_id is None:
                                                        continue
                                                        
                                                    link_row_table = field.get("link_row_table", {})
                                                    target_table_name = "Unknown"
                                                    if isinstance(link_row_table, dict):
                                                        target_table_name = link_row_table.get("name", "Unknown")
                                                    
                                                    field_id = field.get("id")
                                                    if field_id is None:
                                                        continue
                                                        
                                                    field_name = field.get("name", "Unknown Field")
                                                    
                                                    relationship = {
                                                        "source_table_id": table_id,
                                                        "source_table_name": table["name"],
                                                        "target_table_id": int(link_row_table_id),
                                                        "target_table_name": target_table_name,
                                                        "field_id": int(field_id),
                                                        "field_name": field_name
                                                    }
                                                    all_relationships.append(relationship)
                                                except (ValueError, TypeError) as e:
                                                    print(f"Error creating relationship for field: {str(e)}")
                                                    continue
                                    except Exception as e:
                                        print(f"Error processing table {table.get('id', 'unknown')}: {str(e)}")
                                        continue
                                
                                # Add tables to the global list
                                all_tables.extend(database_tables)
                                
                                # Add database to the list
                                all_databases.append({
                                    "id": database_id,
                                    "name": database_name,
                                    "workspace_id": workspace_id,
                                    "workspace_name": workspace_name,
                                    "has_tables": table_count > 0,
                                    "table_count": table_count
                                })
                                
                            except Exception as e:
                                print(f"Error fetching tables for database {database_id}: {str(e)}")
                                # Still add the database to the list, but mark it as having no tables
                                all_databases.append({
                                    "id": database_id,
                                    "name": database_name,
                                    "workspace_id": workspace_id,
                                    "workspace_name": workspace_name,
                                    "has_tables": False,
                                    "table_count": 0
                                })
                                
                        except Exception as e:
                            print(f"Error processing database {database.get('id', 'unknown')}: {str(e)}")
                            continue
                except Exception as e:
                    print(f"Error processing workspace {workspace.get('id', 'unknown')}: {str(e)}")
                    continue

            print(f"\nFinished collecting ERD data:")
            print(f"- Total workspaces: {len(workspaces)}")
            print(f"- Total databases: {len(all_databases)}")
            print(f"- Databases with tables: {sum(1 for db in all_databases if db.get('has_tables', False))}")
            print(f"- Total tables: {len(all_tables)}")
            print(f"- Total relationships: {len(all_relationships)}")
            
            return {
                "tables": all_tables,
                "relationships": all_relationships,
                "databases": all_databases,
                "workspaces": workspaces
            }
        except Exception as e:
            print(f"Error in get_erd_data: {str(e)}")
            raise
