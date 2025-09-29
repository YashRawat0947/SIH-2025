"""
Odoo Integration Utilities for KMRL Train Induction System

This module handles communication with Odoo Community Edition v18
for fetching maintenance data, train assets, and related information.
"""

import xmlrpc.client
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OdooClient:
    """Client for connecting to Odoo and fetching train-related data."""
    
    def __init__(self, url: str = "http://localhost:8069", 
                 db: str = "odoo", 
                 username: str = "admin", 
                 password: str = "admin"):
        """
        Initialize Odoo client connection.
        
        Args:
            url: Odoo server URL
            db: Database name
            username: Login username
            password: Login password
        """
        self.url = url
        self.db = db
        self.username = username
        self.password = password
        self.uid = None
        self.models = None
        self.common = None
        
    def connect(self) -> bool:
        """
        Establish connection to Odoo server.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            # Connect to common endpoint
            self.common = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/common')
            
            # Authenticate
            self.uid = self.common.authenticate(self.db, self.username, self.password, {})
            
            if not self.uid:
                logger.error("Authentication failed")
                return False
            
            # Connect to object endpoint
            self.models = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/object')
            
            logger.info(f"Successfully connected to Odoo as user ID: {self.uid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Odoo: {e}")
            return False
    
    def search_read(self, model: str, domain: List = None, fields: List = None, 
                   limit: int = None) -> List[Dict]:
        """
        Search and read records from Odoo model.
        
        Args:
            model: Odoo model name (e.g., 'maintenance.equipment')
            domain: Search domain criteria
            fields: Fields to retrieve
            limit: Maximum number of records
            
        Returns:
            List of record dictionaries
        """
        if not self.models or not self.uid:
            logger.error("Not connected to Odoo")
            return []
        
        try:
            domain = domain or []
            fields = fields or []
            
            records = self.models.execute_kw(
                self.db, self.uid, self.password,
                model, 'search_read',
                [domain],
                {'fields': fields, 'limit': limit}
            )
            
            logger.info(f"Retrieved {len(records)} records from {model}")
            return records
            
        except Exception as e:
            logger.error(f"Error fetching data from {model}: {e}")
            return []
    
    def get_train_equipment(self) -> pd.DataFrame:
        """
        Fetch train equipment data from Odoo.
        
        Returns:
            DataFrame with train information including mileage, depot, branding
        """
        logger.info("Fetching train equipment data from Odoo...")
        
        # Search for equipment with category containing 'train' or 'metro'
        domain = [
            '|',
            ('category_id.name', 'ilike', 'train'),
            ('category_id.name', 'ilike', 'metro')
        ]
        
        fields = [
            'name', 'code', 'category_id', 'partner_id',
            'location', 'model', 'serial_no', 'effective_date',
            'cost', 'residual_value', 'maintenance_team_id',
            # Custom fields (would need to be added in Odoo)
            'x_mileage', 'x_depot', 'x_branding_hours', 'x_last_maintenance'
        ]
        
        records = self.search_read('maintenance.equipment', domain, fields)
        
        if not records:
            logger.warning("No train equipment found, generating mock data...")
            return self._generate_mock_train_data()
        
        # Convert to DataFrame
        df = pd.DataFrame(records)
        
        # Process and clean data
        df = self._process_train_equipment_data(df)
        
        return df
    
    def get_maintenance_requests(self) -> pd.DataFrame:
        """
        Fetch open maintenance requests (job cards) from Odoo.
        
        Returns:
            DataFrame with maintenance request information
        """
        logger.info("Fetching maintenance requests from Odoo...")
        
        # Search for open maintenance requests (stage_id = 'To Do')
        domain = [
            ('stage_id.name', '=', 'To Do')
        ]
        
        fields = [
            'name', 'equipment_id', 'maintenance_type', 'user_id',
            'owner_user_id', 'category_id', 'request_date', 'schedule_date',
            'maintenance_team_id', 'duration', 'description', 'priority',
            'kanban_state', 'color', 'stage_id'
        ]
        
        records = self.search_read('maintenance.request', domain, fields)
        
        if not records:
            logger.info("No open maintenance requests found")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(records)
        
        # Process maintenance request data
        df = self._process_maintenance_requests_data(df)
        
        return df
    
    def get_work_orders(self) -> pd.DataFrame:
        """
        Fetch work orders from Odoo manufacturing module if available.
        
        Returns:
            DataFrame with work order information
        """
        logger.info("Fetching work orders from Odoo...")
        
        # Search for active work orders
        domain = [
            ('state', 'in', ['ready', 'progress', 'waiting'])
        ]
        
        fields = [
            'name', 'product_id', 'production_id', 'workcenter_id',
            'state', 'date_planned_start', 'date_planned_finished',
            'duration_expected', 'duration', 'qty_production', 'qty_produced'
        ]
        
        records = self.search_read('mrp.workorder', domain, fields)
        
        if not records:
            logger.info("No active work orders found")
            return pd.DataFrame()
        
        return pd.DataFrame(records)
    
    def _process_train_equipment_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process and standardize train equipment data."""
        if df.empty:
            return df
        
        # Extract equipment names/codes as train IDs
        df['train_id'] = df['code'].fillna(df['name'])
        
        # Handle custom fields with default values
        df['mileage'] = df.get('x_mileage', 0).fillna(0)
        df['depot'] = df.get('x_depot', 'Main').fillna('Main')
        df['branding_hours'] = df.get('x_branding_hours', 0).fillna(0)
        
        # Process dates
        if 'x_last_maintenance' in df.columns:
            df['last_maintenance'] = pd.to_datetime(df['x_last_maintenance'], errors='coerce')
        else:
            df['last_maintenance'] = pd.to_datetime('2024-01-01')
        
        # Calculate days since maintenance
        df['days_since_maintenance'] = (datetime.now() - df['last_maintenance']).dt.days
        
        return df
    
    def _process_maintenance_requests_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process and standardize maintenance request data."""
        if df.empty:
            return df
        
        # Extract equipment ID for joining
        df['equipment_id'] = df['equipment_id'].apply(
            lambda x: x[0] if isinstance(x, list) and len(x) > 0 else x
        )
        
        # Process dates
        df['request_date'] = pd.to_datetime(df['request_date'], errors='coerce')
        df['schedule_date'] = pd.to_datetime(df['schedule_date'], errors='coerce')
        
        return df
    
    def _generate_mock_train_data(self) -> pd.DataFrame:
        """Generate mock train data when Odoo is not available."""
        logger.info("Generating mock train equipment data...")
        
        trains = []
        depots = ['Aluva', 'Palarivattom', 'Kalamassery']
        
        for i in range(1, 26):  # 25 trains as specified
            train_id = f"KMRL-{i:03d}"
            trains.append({
                'id': i,
                'train_id': train_id,
                'name': f"Metro Train {train_id}",
                'code': train_id,
                'mileage': int(np.random.randint(50000, 200000)),
                'depot': str(np.random.choice(depots)),
                'branding_hours': int(np.random.randint(0, 100)),
                'last_maintenance': datetime.now() - timedelta(days=int(np.random.randint(1, 30))),
                'days_since_maintenance': int(np.random.randint(1, 30)),
                'category_id': [1, 'Metro Train'],
                'location': f"Depot {np.random.choice(depots)}",
                'maintenance_team_id': [1, 'Metro Maintenance Team']
            })
        
        return pd.DataFrame(trains)


def get_odoo_data(use_mock: bool = False) -> Dict[str, pd.DataFrame]:
    """
    Fetch all required data from Odoo or return mock data.
    
    Args:
        use_mock: If True, skip Odoo connection and use mock data
        
    Returns:
        Dictionary containing DataFrames for trains, maintenance_requests, work_orders
    """
    if use_mock:
        logger.info("Using mock data instead of Odoo connection")
        client = OdooClient()
        return {
            'trains': client._generate_mock_train_data(),
            'maintenance_requests': pd.DataFrame(),
            'work_orders': pd.DataFrame()
        }
    
    client = OdooClient()
    
    if not client.connect():
        logger.warning("Failed to connect to Odoo, falling back to mock data")
        return {
            'trains': client._generate_mock_train_data(),
            'maintenance_requests': pd.DataFrame(),
            'work_orders': pd.DataFrame()
        }
    
    # Fetch all data
    trains_df = client.get_train_equipment()
    maintenance_df = client.get_maintenance_requests()
    work_orders_df = client.get_work_orders()
    
    return {
        'trains': trains_df,
        'maintenance_requests': maintenance_df,
        'work_orders': work_orders_df
    }


if __name__ == "__main__":
    # Test the Odoo connection
    import numpy as np
    
    print("Testing Odoo integration...")
    data = get_odoo_data(use_mock=True)
    
    print(f"Trains: {len(data['trains'])} records")
    print(f"Maintenance Requests: {len(data['maintenance_requests'])} records")
    print(f"Work Orders: {len(data['work_orders'])} records")
    
    if not data['trains'].empty:
        print("\nSample train data:")
        print(data['trains'].head())