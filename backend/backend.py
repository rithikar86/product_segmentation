import base64
import bcrypt
import io
import json
import jwt
import os
import time
import traceback
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from itertools import combinations
from types import SimpleNamespace
from typing import Dict, List, Optional, Tuple, Any
import uuid

import pandas as pd
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId

from middleware.auth import token_required
from services.analysis import (
    build_analysis_pipeline, 
    recommend_products, 
    RecommendationConfig, 
    DataValidationError,
    PipelineArtifacts,
    validate_and_convert_csv,
    update_rfm_segments,
    RFMConfig,
    build_segment_top_products
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]}}, supports_credentials=True)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.before_request
def log_request_info():
    print("--- API Request Received: " + request.path + " ---")

# Configure Flask for large file uploads (100 MB limit)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB
app.config['REQUEST_TIMEOUT'] = 600  # 10 minutes timeout

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/voltstream_db')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'voltstream_db')
JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret')
JWT_ALGORITHM = 'HS256'

# Print warnings if defaults were used
if os.getenv('MONGO_URI') is None:
    print('[WARNING] MONGO_URI not set, using default mongodb://localhost:27017/')
if os.getenv('MONGO_DB_NAME') is None:
    print('[WARNING] MONGO_DB_NAME not set, using default voltstream_db')
if os.getenv('JWT_SECRET') is None:
    print('[WARNING] JWT_SECRET not set, using fallback secret. Set JWT_SECRET in environment for production.')

# Initialize MongoDB connection with error handling
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection by pinging the server
    client.admin.command('ping')
    db = client[MONGO_DB_NAME]
    
    # Initialize collections and create indexes for performance
    customers_collection = db.customers
    transactions_collection = db.transactions
    users_collection = db.users
    inventory_collection = db.inventory
    
    # Efficiency: Unique index on email for authentication
    users_collection.create_index('email', unique=True)
    
    # Efficiency: Compound Index for fast dashboard loading
    transactions_collection.create_index([('shop_id', 1), ('order_date', -1)])
    
    # Index on shop_id for customer lookups
    customers_collection.create_index([('shop_id', 1), ('CustomerID', 1)])
    inventory_collection.create_index([('shop_id', 1), ('product_name', 1)])
    
    print('[SUCCESS] Successfully connected to MongoDB and optimized storage engine')
except Exception as e:
    print(f'[ERROR] Connection to MongoDB failed: {str(e)}')
    raise RuntimeError(f'Failed to connect to MongoDB: {str(e)}')


def serialize_customer_doc(customer: dict) -> dict:
    """Convert MongoDB document values to JSON-safe output."""
    return {
        'id': str(customer.get('_id')) if customer.get('_id') is not None else None,
        **{k: (str(v) if isinstance(v, ObjectId) else v) for k, v in customer.items() if k != '_id'},
    }


def _normalize_key(key: str) -> str:
    if key is None:
        return ''
    return ''.join(ch for ch in str(key).lower() if ch.isalnum())


def _find_best_match(doc: dict, candidates: list):
    if not isinstance(doc, dict):
        return None
    lower = {_normalize_key(k): v for k, v in doc.items() if k is not None}
    for candidate in candidates:
        target = _normalize_key(candidate)
        if target in lower:
            return lower[target]
    for key, value in lower.items():
        if any(target in key for target in (_normalize_key(c) for c in candidates)):
            return value
    return None


def _extract_bearer_token(auth_header: str) -> Optional[str]:
    if not auth_header or not isinstance(auth_header, str):
        return None
    parts = auth_header.strip().split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None


def _decode_jwt_payload(jwt_token: str) -> dict:
    if not jwt_token or not isinstance(jwt_token, str):
        return {}
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload if isinstance(payload, dict) else {}
    except jwt.ExpiredSignatureError:
        print('[WARNING] JWT token has expired.')
        return {}
    except jwt.InvalidTokenError as ex:
        print(f'[ERROR] Invalid JWT token: {ex}')
        return {}


def _create_access_token(shop_id: str, email: str, extra_claims: dict = None, expires_minutes: int = 60 * 24) -> str:
    now = datetime.utcnow()
    payload = {
        'sub': str(shop_id),
        'shopId': str(shop_id),
        'email': email,
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(minutes=expires_minutes)).timestamp())
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _check_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def _get_shop_id_claim(payload: dict) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    return (
        payload.get('shopId')
        or payload.get('shop_id')
        or payload.get('tenantId')
        or payload.get('tenant_id')
        or payload.get('sub')
    )


def _get_current_user() -> SimpleNamespace:
    user = getattr(request, 'user', None) or getattr(g, 'user', None)
    if user is not None:
        return user

    shop_id = getattr(g, 'shop_id', None)
    if shop_id is not None:
        user = SimpleNamespace(shopId=shop_id, claims={})
        try:
            request.user = user
        except Exception:
            pass
        g.user = user
        return user

    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    jwt_token = _extract_bearer_token(auth_header)
    payload = _decode_jwt_payload(jwt_token) if jwt_token else {}
    shop_id = _get_shop_id_claim(payload)
    user = SimpleNamespace(shopId=shop_id, claims=payload)
    try:
        request.user = user
    except Exception:
        pass
    g.user = user
    return user


def _get_shop_owner_id() -> Optional[str]:
    user = _get_current_user()
    return getattr(user, 'shopId', None)


def _normalize_shop_owner_id(shop_id):
    if shop_id is None:
        return None
    if isinstance(shop_id, str) and ObjectId.is_valid(shop_id):
        return ObjectId(shop_id)
    return shop_id


def _get_tenant_filter() -> dict:
    shop_id = getattr(g, 'shop_id', None)
    if not shop_id:
        # Return a filter that matches nothing if shop_id is missing
        return {'shop_id': 'NON_EXISTENT'}
    return {'shop_id': shop_id}


def _get_tenant_transactions(tenant_filter: Optional[dict] = None) -> pd.DataFrame:
    try:
        docs = list(transactions_collection.find(tenant_filter or {}, {
            'CustomerID': 1,
            'order_date': 1,
            'transaction_id': 1,
            'product_id': 1,
            'product_name': 1,
            'category': 1,
            'quantity': 1,
            'product_price': 1,
            'total_value': 1,
            'PhoneNumber': 1,
            'OrderStatus': 1,
            'Location': 1
        }))
    except Exception:
        return pd.DataFrame()

    if not docs:
        return pd.DataFrame()

    df = pd.DataFrame(docs)
    df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce')
    df['quantity'] = pd.to_numeric(df.get('quantity', pd.Series([], dtype='float64')), errors='coerce').fillna(0)
    df['product_price'] = pd.to_numeric(df.get('product_price', pd.Series([], dtype='float64')), errors='coerce').fillna(0.0)
    df['total_value'] = pd.to_numeric(df.get('total_value', pd.Series([], dtype='float64')), errors='coerce').fillna(df['quantity'] * df['product_price'])
    df['product_id'] = df['product_id'].astype(str).fillna('UNKNOWN')
    df['product_name'] = df['product_name'].astype(str).fillna('Unknown product')
    df['category'] = df['category'].astype(str).replace({'nan': ''}).str.strip()
    df.loc[df['category'] == '', 'category'] = df.loc[df['category'] == '', 'product_name'].str.split().str[0].fillna('Unknown')
    return df.reset_index(drop=True)


def _require_tenant():
    shop_id = _get_shop_owner_id()
    if not shop_id:
        response = jsonify({'error': 'Missing or invalid Authorization token with shopId claim.'})
        response.status_code = 401
        return response
    return None


def _parse_transaction_record(raw: dict, customer_id=None, customer_email=None) -> dict:
    if not isinstance(raw, dict):
        return {}
    record = {}
    record['CustomerID'] = customer_id or _find_best_match(raw, ['CustomerID', 'customerid', 'customer_id', 'customer'])
    record['CustomerEmail'] = customer_email or _find_best_match(raw, ['email', 'customeremail', 'emailaddress'])
    record['InvoiceNo'] = _find_best_match(raw, ['InvoiceNo', 'invoice_no', 'invoice', 'orderId', 'order'])
    record['InvoiceDate'] = _find_best_match(raw, ['InvoiceDate', 'orderDate', 'date', 'transactionDate', 'timestamp'])
    record['StockCode'] = _find_best_match(raw, ['StockCode', 'sku', 'productcode', 'itemcode'])
    record['Description'] = _find_best_match(raw, ['Description', 'productName', 'name', 'item', 'title'])
    record['Category'] = _find_best_match(raw, ['Category', 'productCategory'])
    record['Quantity'] = _find_best_match(raw, ['Quantity', 'qty', 'count', 'units'])
    record['UnitPrice'] = _find_best_match(raw, ['UnitPrice', 'price', 'amount', 'totalPrice'])
    record['TotalPrice'] = _find_best_match(raw, ['TotalPrice', 'total_price', 'revenue'])
    return record


def _extract_transactions_from_customer_doc(customer: dict) -> list[dict]:
    history = None
    for key in ['purchaseHistory', 'purchase_history', 'history', 'transactions', 'orders', 'purchases']:
        if key in customer:
            history = customer[key]
            break
    if not isinstance(history, list):
        return []

    customer_id = customer.get('CustomerID') or customer.get('customerId') or customer.get('customer_id') or customer.get('id') or customer.get('_id')
    customer_email = customer.get('email') or customer.get('Email')
    records = []
    for row in history:
        record = _parse_transaction_record(row, customer_id=customer_id, customer_email=customer_email)
        if record.get('InvoiceNo') and record.get('InvoiceDate') and record.get('StockCode'):
            records.append(record)
    return records


def _extract_transactions_from_mongo_collection(tenant_filter: Optional[dict] = None) -> list:
    try:
        docs = list(transactions_collection.find(tenant_filter or {}))
    except Exception:
        return []
    records = []
    for doc in docs:
        record = _parse_transaction_record(doc)
        if record.get('InvoiceNo') and record.get('InvoiceDate') and record.get('StockCode'):
            records.append(record)
    return records


def _build_transactions_dataframe(customer_docs: list, tenant_filter: Optional[dict] = None) -> pd.DataFrame:
    records = []
    for customer in customer_docs:
        records.extend(_extract_transactions_from_customer_doc(customer))
    records.extend(_extract_transactions_from_mongo_collection(tenant_filter))

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce')
    df['ProductLabel'] = df['product_id'].astype(str) + ' — ' + df['product_name'].astype(str)
    df = df.dropna(subset=['order_date', 'transaction_id', 'product_id'])
    return df.reset_index(drop=True)



@app.route('/')
def home():
    return {
        'status': 'online',
        'message': 'Retail Analytics API is running!',
        'version': '1.1'
    }


@app.route('/api/auth/register', methods=['POST'])
@app.route('/api/auth/signup', methods=['POST'])
def register():
    # Variable Fix: explicitly define shop_name at the very top
    data = request.get_json(silent=True) or {}
    shop_name = data.get('shopName')

    try:
        print("--- Signup Request Received ---")
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        owner_name = data.get('ownerName') or ''
        location = data.get('location') or ''

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

        # Collection Check: using initialized users_collection
        if users_collection.find_one({'email': email}):
            return jsonify({'success': False, 'error': 'Account already exists.'}), 400

        shop_owner_id = str(uuid.uuid4())
        new_user = {
            'email': email,
            'password_hash': _hash_password(password),
            'shop_id': shop_owner_id,
            'shop_name': shop_name, # Mapping frontend shopName to backend shop_name
            'owner_name': owner_name,
            'location': location,
            'created_at': datetime.utcnow()
        }

        # Verification: Print right before the insert_one
        print(f"DEBUG: Data being sent to MongoDB: {new_user}")

        # The Save Command: Wrap in try-except
        try:
            result = users_collection.insert_one(new_user)
            print(f"Successfully saved user with ID: {result.inserted_id}")
        except Exception as mongo_err:
            print(f"MongoDB Save Error: {mongo_err}")
            raise mongo_err

        # Ensure all keys from frontend are correctly mapped for the token
        extra_claims = {
            'ownerName': owner_name,
            'shopName': shop_name,
            'location': location
        }
        token = _create_access_token(shop_owner_id, email, extra_claims=extra_claims)

        # Print confirmation in console
        print(f"Successfully created account for {email} in voltstream_db")

        # Success Response: include message and redirect as requested
        return jsonify({
            "success": True, 
            "message": "Account created", 
            "redirect": "/signin",
            "accessToken": token,
            "shopId": shop_owner_id,
            "shopName": shop_name,
            "ownerName": owner_name
        }), 201
    except Exception as e:
        print(f"--- Signup Error: {str(e)} ---")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Internal Server Error: {str(e)}'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        print("--- Login Request Received ---")
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

        shop_owner = users_collection.find_one({'email': email})
        if not shop_owner or not _check_password(password, shop_owner.get('password_hash', '')):
            return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

        token = _create_access_token(
            shop_owner.get('shop_id'), 
            email, 
            extra_claims={
                'ownerName': shop_owner.get('owner_name', 'N/A'),
                'shopName': shop_owner.get('shop_name', 'N/A'),
                'location': shop_owner.get('location', 'N/A')
            }
        )
        return jsonify({
            'success': True,
            'shopId': shop_owner.get('shop_id'),
            'accessToken': token,
            'shopName': shop_owner.get('shop_name'),
            'ownerName': shop_owner.get('owner_name'),
            'location': shop_owner.get('location')
        }), 200
    except Exception as e:
        print(f"--- Login Error: {str(e)} ---")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Internal Server Error: {str(e)}'}), 500


@app.route('/api/auth/me', methods=['GET'])
@token_required
def auth_me():
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    user = _get_current_user()
    return jsonify({
        'shopId': user.shopId,
        'claims': user.claims
    }), 200


@app.route('/api/analysis/rfm', methods=['POST'])
@token_required
def analysis_rfm():
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded. Attach as multipart/form-data with field name file.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Uploaded file has no filename.'}), 400

    try:
        converted_df, mapping = validate_and_convert_csv(io.BytesIO(file.read()))
        rfm_df = update_rfm_segments(converted_df, RFMConfig(output_csv_path=None))

        return jsonify({
            'success': True,
            'row_count': len(converted_df),
            'rfm_count': len(rfm_df),
            'mapping': mapping,
            'rfm': rfm_df.to_dict(orient='records')
        }), 200
    except Exception as e:
        print(f"Error in analysis_rfm: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/analysis/recommendations', methods=['GET'])
@token_required
def analysis_recommendations():
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    tenant_filter = _get_tenant_filter()
    transactions = _get_tenant_transactions(tenant_filter)
    if transactions.empty:
        return jsonify({
            'success': True, 
            'rules': [], 
            'recommendations': [], 
            'message': 'Please Upload Data'
        }), 200

    min_support = int(request.args.get('min_support', 2))
    top_n = int(request.args.get('top_n', 10))
    rules = build_apriori_rules(transactions, min_support=min_support, top_n=top_n)

    customer_id = request.args.get('customer_id')
    recommendations = []
    if customer_id:
        try:
            rfm = update_rfm_segments(transactions)
            segment_top_products = build_segment_top_products(transactions, rfm)
            cooccurrence = build_cooccurrence(transactions)
            recommendation_df = recommend_products(
                int(customer_id),
                transactions,
                rfm,
                segment_top_products,
                cooccurrence,
                RecommendationConfig(top_n=min(top_n, 10))
            )
            recommendations = recommendation_df.to_dict(orient='records')
        except DataValidationError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            print(f"Error building customer recommendations: {traceback.format_exc()}")
            recommendations = []

    return jsonify({
        'success': True,
        'rules': rules,
        'recommendations': recommendations,
        'count': len(rules)
    }), 200


@app.route('/api/customers', methods=['GET'])
@token_required
def get_customers():
    """Fetches all customers from MongoDB for the current tenant."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        customers = list(customers_collection.find(tenant_filter))
        if not customers:
            return jsonify([]), 200
        return jsonify([serialize_customer_doc(customer) for customer in customers])
    except Exception as e:
        print(f"Error in get_customers: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/inventory', methods=['GET'])
@token_required
def get_inventory():
    """Fetches inventory status grouped by product_name and order_status."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        pipeline = [
            {'$match': tenant_filter},
            {
                '$group': {
                    '_id': {
                        'product': '$product_name',
                        'status': '$order_status'
                    },
                    'count': {'$sum': 1}
                }
            }
        ]
        results = list(transactions_collection.aggregate(pipeline))
        
        inventory = {}
        for r in results:
            prod = r['_id']['product']
            status = r['_id']['status']
            count = r['count']
            if prod not in inventory:
                inventory[prod] = {'In Process': 0, 'Delivered': 0, 'Total': 0}
            
            if status == 'In Process':
                inventory[prod]['In Process'] += count
            elif status == 'Delivered':
                inventory[prod]['Delivered'] += count
            
            inventory[prod]['Total'] += count

        return jsonify({
            'success': True,
            'inventory': [
                {'product': k, **v} for k, v in inventory.items()
            ]
        }), 200
    except Exception as e:
        print(f"Error in get_inventory: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


def _format_inr(amount: float) -> str:
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        amount = 0.0
    return f"₹{amount:,.2f}"


def _convert_excel_date(excel_val: Any) -> datetime:
    """Converts Excel numeric dates (float/int) to Python datetime objects."""
    try:
        if isinstance(excel_val, datetime):
            return excel_val
        f_val = float(excel_val)
        # Excel epoch is Dec 30, 1899
        return datetime(1899, 12, 30) + timedelta(days=f_val)
    except (ValueError, TypeError, OverflowError):
        try:
            return pd.to_datetime(excel_val)
        except:
            return datetime.utcnow()


@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    """Fetches live dashboard statistics from MongoDB for the current tenant."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        total_customers = customers_collection.count_documents(tenant_filter)
        transaction_count = transactions_collection.count_documents(tenant_filter)

        total_revenue = 0.0
        if transaction_count > 0:
            pipeline = [
                {'$match': tenant_filter},
                {
                    '$group': {
                        '_id': None,
                        'total': {
                            '$sum': {
                                '$ifNull': ['$total_value', '$TotalPrice']
                            }
                        }
                    }
                }
            ]
            result = list(transactions_collection.aggregate(pipeline))
            if result and result[0].get('total') is not None:
                total_revenue = float(result[0]['total'])

        invoice_count = len(transactions_collection.distinct('transaction_id', tenant_filter)) if transaction_count > 0 else 0
        avg_order_value = float(total_revenue / invoice_count) if invoice_count else 0.0

        segment_summary = list(customers_collection.aggregate([
            {'$match': tenant_filter},
            {'$group': {'_id': '$segment', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 1}
        ]))
        top_segment = segment_summary[0]['_id'] if segment_summary else 'N/A'

        # Calculate fulfillment rate for simulator
        fulfillment_pipe = [
            {'$match': tenant_filter},
            {
                '$group': {
                    '_id': '$order_status',
                    'count': {'$sum': 1}
                }
            }
        ]
        status_counts = {r['_id']: r['count'] for r in transactions_collection.aggregate(fulfillment_pipe)}
        delivered = status_counts.get('Delivered', 0)
        total_orders = sum(status_counts.values())
        fulfillment_rate = round((delivered / total_orders) * 100, 1) if total_orders > 0 else 0.0

        return jsonify({
            'total_customers': total_customers,
            'transaction_count': transaction_count,
            'total_revenue': total_revenue,
            'invoice_count': invoice_count,
            'avg_order_value': avg_order_value,
            'top_segment': top_segment,
            'fulfillment_rate': fulfillment_rate
        }), 200
    except Exception as e:
        print(f"Error in get_stats: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
def get_segment_stats():
    """Returns the count of customers per segment using MongoDB aggregation."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        category = request.args.get('category')
        
        # Build filter with optional category
        stats_filter = tenant_filter.copy()
        if category and category != 'All':
            stats_filter['category'] = category

        # Get total customers (Unique customer_name from transactions)
        total_customers = len(transactions_collection.distinct('customer_name', stats_filter))
        
        # Get total revenue
        pipeline_revenue = [
            {'$match': stats_filter},
            {
                '$group': {
                    '_id': None,
                    'total': {'$sum': '$total_value'}
                }
            }
        ]
        revenue_res = list(transactions_collection.aggregate(pipeline_revenue))
        total_revenue = revenue_res[0]['total'] if revenue_res else 0.0
        
        # Get active segments (Note: segments are in customers_collection, which doesn't have 'category')
        # However, we can find customers who bought in this category
        customer_ids_in_category = transactions_collection.distinct('CustomerID', stats_filter)
        
        segment_filter = tenant_filter.copy()
        segment_filter['CustomerID'] = {'$in': [str(cid) for cid in customer_ids_in_category]}

        # Get active segments
        pipeline_segments = [
            {'$match': segment_filter},
            {
                '$group': {
                    '_id': '$segment',
                    'count': {'$sum': 1}
                }
            },
            {'$sort': {'count': -1}}
        ]
        segment_results = list(customers_collection.aggregate(pipeline_segments))
        active_segments = [
            {'name': r['_id'] or 'Unknown', 'value': r['count']}
            for r in segment_results
        ]
        
        return jsonify({
            'success': True,
            'totalCustomers': total_customers,
            'totalRevenue': total_revenue,
            'activeSegments': active_segments
        }), 200
        
    except Exception as e:
        print(f"Error in get_segment_stats: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/dashboard/top-products', methods=['GET'])
@token_required
def get_top_products():
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        transactions = _get_tenant_transactions(tenant_filter)
        if transactions.empty:
            return jsonify({'success': True, 'topProducts': []}), 200

        rfm = update_rfm_segments(transactions)
        top_products = build_segment_top_products(transactions, rfm)
        payload = []

        for segment_name, df in top_products.items():
            products = [
                {
                    'product': str(row['ProductLabel']),
                    'sales': float(row['monetary']),
                    'count': int(row['purchase_count'])
                }
                for _, row in df.head(5).iterrows()
            ]
            payload.append({'segment': segment_name, 'products': products})

        return jsonify({'success': True, 'topProducts': payload}), 200
    except Exception as e:
        print(f"Error in get_top_products: {traceback.format_exc()}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/upload-csv', methods=['POST'])
@app.route('/api/upload', methods=['POST'])
@token_required
def upload_csv():
    """Uploads CSV/Excel data, calculates RFM scores, and saves to MongoDB."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Use multipart/form-data with a "file" field.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Uploaded file has no filename.'}), 400

        start_time = time.time()
        shop_owner_id = _get_shop_owner_id()
        if not shop_owner_id:
            return jsonify({'error': 'Unauthorized: Shop owner ID not found in token.'}), 401

        file_content = file.read()
        if not file_content:
            return jsonify({'error': 'Uploaded file is empty.'}), 400

        # Validate and convert using the standardized analysis service
        try:
            converted_df, mapping = validate_and_convert_csv(io.BytesIO(file_content), file.filename)
        except Exception as e:
            print(f"Validation Error: {str(e)}")
            return jsonify({'error': str(e)}), 400

        if converted_df.empty:
            return jsonify({'error': 'File contains no valid data.'}), 400

        # Debug Log: Print df.head() and len(df)
        print("\n--- Data Verification ---")
        print(f"Dataframe Head:\n{converted_df.head()}")
        print(f"Total Rows: {len(converted_df)}")
        print("------------------------\n")

        # Database Clean: Clear any existing data for the current shop_id before inserting new data
        transactions_collection.delete_many({'shop_id': shop_owner_id})
        # Note: We keep customers to update them, but transactions are fresh

        # SINGLE-PASS PROCESSOR: Efficient memory-first pipeline
        # 1. Prepare Transactions (Architecture optimized)
        transactions_to_insert = []
        for _, row in converted_df.iterrows():
            order_date = _convert_excel_date(row.get('InvoiceDate'))
            transaction_doc = {
                'transaction_id': str(row.get('InvoiceNo')),
                'product_id': str(row.get('StockCode', 'Unknown')),
                'product_name': str(row.get('Description', '')),
                'category': str(row.get('Category', 'Retail')),
                'product_price': float(row.get('UnitPrice', 0.0)),
                'quantity': float(row.get('Quantity', 1)),
                'total_value': float(row.get('TotalPrice', 0.0)),
                'order_date': order_date,
                'order_status': str(row.get('OrderStatus', 'Completed')),
                'CustomerID': str(row.get('CustomerID')),
                'customer_name': str(row.get('CustomerName', '')),
                'email': str(row.get('CustomerEmail', '')),
                'phone': str(row.get('PhoneNumber', '')),
                'location': str(row.get('Location', '')),
                'shop_id': shop_owner_id,
                'created_at': datetime.utcnow()
            }
            transactions_to_insert.append(transaction_doc)

        # 2. Prepare RFM for Customers
        rfm_df = update_rfm_segments(converted_df)

        from pymongo import UpdateOne
        customer_updates = []
        for _, row in rfm_df.iterrows():
            customer_id = str(row['CustomerID'])
            if not customer_id or customer_id == 'nan': continue
            
            orig_row = converted_df[converted_df['CustomerID'] == row['CustomerID']].iloc[0]
            update_data = {
                'shop_id': shop_owner_id,
                'customer_name': str(orig_row.get('CustomerName', '')),
                'email': str(orig_row.get('CustomerEmail', '')),
                'phone': str(orig_row.get('PhoneNumber', '')),
                'total_spent': float(row['Monetary']),
                'transaction_count': int(row['Frequency']),
                'recency': int(row['Recency']),
                'last_purchase_date': _convert_excel_date(orig_row.get('InvoiceDate')),
                'rfm_score': int(row.get('RFM_Score', 0)),
                'rfm_scores': {
                    'R': int(row['R_Score']),
                    'F': int(row['F_Score']),
                    'M': int(row['M_Score'])
                },
                'segment': row['Segment'],
                'last_updated': datetime.utcnow()
            }
            customer_updates.append(UpdateOne(
                {'CustomerID': customer_id, 'shop_id': shop_owner_id},
                {'$set': update_data},
                upsert=True
            ))

        # 3. Prepare Inventory (Single-pass grouping as requested)
        inventory_updates = []
        # Group by Description (mapped to product_name) and sum Quantity (number_of_ordered_items)
        inventory_summary = converted_df.groupby('Description').agg({
            'Quantity': 'sum',
            'TotalPrice': 'sum'
        }).reset_index()
        
        for _, row in inventory_summary.iterrows():
            prod_name = str(row['Description'])
            qty_ordered = int(row['Quantity'])
            total_revenue = float(row['TotalPrice'])
            
            inventory_updates.append(UpdateOne(
                {'product_name': prod_name, 'shop_id': shop_owner_id},
                {
                    '$set': {
                        'current_stock_level': 1000 - qty_ordered, # Base stock - ordered
                        'ordered_quantity': qty_ordered,
                        'total_revenue': total_revenue,
                        'demand_forecast_score': round(total_revenue / 1000, 2),
                        'last_updated': datetime.utcnow()
                    }
                },
                upsert=True
            ))

        # BULK STORAGE ENGINE: Batch updates to minimize lag
        if transactions_to_insert:
            transactions_collection.insert_many(transactions_to_insert)
        if customer_updates:
            customers_collection.bulk_write(customer_updates)
        if inventory_updates:
            inventory_collection.bulk_write(inventory_updates)

        elapsed = round(time.time() - start_time, 2)
        records_per_second = round(len(converted_df) / max(1, elapsed), 2)
        success_rate = round((len(customer_updates) / max(1, len(converted_df))) * 100, 2)

        return jsonify({
            'success': True,
            'message': f'Single-Pass Processing Complete: {len(transactions_to_insert)} records synced.',
            'shop_id': shop_owner_id,
            'customers_updated': len(customer_updates),
            'inventory_items': len(inventory_updates),
            'transactions_inserted': len(transactions_to_insert),
            'total_rows_processed': len(converted_df),
            'processing_time_seconds': elapsed,
            'records_per_second': records_per_second,
            'upload_result': {
                'customers_inserted': len(customer_updates),
                'total_rows_processed': len(converted_df)
            },
            'success_rate': success_rate
        }), 200

    except DataValidationError as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 400
    except Exception as e:
        print(f"CRITICAL ERROR in upload_csv: {traceback.format_exc()}")
        return jsonify({
            'error': 'Data processing failed',
            'details': str(e),
            'success': False
        }), 500


@app.route('/api/campaign/segment-send', methods=['POST'])
@token_required
def trigger_segment_campaign():
    return jsonify({
        'success': False,
        'error': 'Campaign messaging has been retired. Use the analytics pipeline for data projections only.'
    }), 410


@app.route('/api/send-bulk', methods=['POST'])
@token_required
def send_bulk_notifications():
    return jsonify({
        'success': False,
        'error': 'Bulk notification delivery has been retired. The platform now focuses on RFM analytics and simulation.'
    }), 410


@app.route('/api/set-offers', methods=['POST'])
@app.route('/set-offers', methods=['POST'])
@token_required
def set_offers():
    """Allows the frontend to save specific discount rules for different RFM segments."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    data = request.json
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Invalid data format. Expected JSON object with segment offers.'}), 400
    
    try:
        shop_owner_id = _get_shop_owner_id()
        offers_collection = db.offers
        offers_collection.delete_many(_get_tenant_filter())

        offers = []
        for segment, offer in data.items():
            doc = {
                'segment': segment,
                'discount_percentage': offer.get('discount_percentage', 0),
                'description': offer.get('description', ''),
                'valid_until': offer.get('valid_until'),
                'created_at': datetime.now()
            }
            if shop_owner_id is not None:
                doc['shop_id'] = _normalize_shop_owner_id(shop_owner_id)
            offers.append(doc)

        if offers:
            offers_collection.insert_many(offers)

        return jsonify({
            'message': f'Successfully saved {len(offers)} offer rules.',
            'offers': offers
        }), 200
        
    except Exception as e:
        print(f"Error in set_offers: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/recommendations', methods=['GET'])
@app.route('/api/recommendations', methods=['GET'])
@token_required
def get_recommendations():
    """Fetches the latest tenant-scoped Apriori-based product pairs."""
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        transactions = _get_tenant_transactions(tenant_filter)

        if transactions.empty:
            return jsonify({
                'success': True,
                'recommendations': [], 
                'count': 0, 
                'message': 'Please Upload Data'
            }), 200

        rules = _build_apriori_rules(transactions, min_support=2, top_n=10)

        return jsonify({
            'success': True,
            'recommendations': rules,
            'count': len(rules)
        }), 200

    except Exception as e:
        print(f"Error in get_recommendations: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/send-alerts', methods=['POST'])
@token_required
def send_alerts():

@app.route('/api/simulator/send-campaign', methods=['POST'])
@token_required
def simulator_send_campaign():
    tenant_error = _require_tenant()
    if tenant_error:
        return tenant_error

    try:
        tenant_filter = _get_tenant_filter()
        customers = list(customers_collection.find(tenant_filter))

        if not customers:
            return jsonify({'success': False, 'error': 'No customers found'}), 404

        transactions = _get_tenant_transactions(tenant_filter)
        rfm = update_rfm_segments(transactions) if not transactions.empty else None

        segment_summary = {}
        if rfm is not None and not rfm.empty:
            segment_summary = rfm['Segment'].value_counts().to_dict()

        top_products = []
        if transactions is not None and not transactions.empty and rfm is not None and not rfm.empty:
            top_products_map = build_segment_top_products(transactions, rfm)
            for segment_name, df in top_products_map.items():
                top_products.append({
                    'segment': segment_name,
                    'products': [
                        {
                            'product': str(row['ProductLabel']),
                            'sales': float(row['monetary']),
                            'count': int(row['purchase_count'])
                        }
                        for _, row in df.head(3).iterrows()
                    ]
                })

        return jsonify({
            'success': True,
            'projected_customers': len(customers),
            'segment_summary': segment_summary,
            'top_products': top_products,
            'message': 'What-if simulation completed using the RFM analytics pipeline.'
        }), 200
    except Exception as e:
        print(f"Error in simulator_send_campaign: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/send-email', methods=['POST'])
@token_required
def send_email():
    return jsonify({
        'success': False,
        'error': 'Email sending is deprecated. This endpoint is no longer supported.'
    }), 410


def _format_rule(rule: dict) -> str:
    return f"{rule['antecedent']} -> {rule['consequent']} (conf={rule['confidence']}, support={rule['support']})"

def _build_customer_message(name: str, segment: str, product_suggestion: str, rule_text: str) -> str:
    base = f"Hello {name},\n\nThis is an automated update regarding your segment: {segment}. We're recommending: {product_suggestion}."
    if rule_text:
        base += f"\n\nThe suggestion was chosen from global cross-sell rules: {rule_text}."
    return base

if __name__ == '__main__':
    # Add a sanity check for MongoDB connection before starting
    try:
        client = MongoClient(MONGO_URI)
        client.admin.command('ping')
        print("[SUCCESS] Successfully connected to MongoDB Compass")
    except Exception as e:
        print(f"Error connecting to MongoDB: {str(e)}")

    # Initialize collections with tenant awareness check
    try:
        db = client[MONGO_DB_NAME]
        # Just a check to see if collections exist
        col_names = db.list_collection_names()
        print(f"[*] VoltStream Backend is active on http://localhost:5000")
        print(f"Connected to MongoDB: {MONGO_DB_NAME}")
        if 'transactions' in col_names:
            count = db.transactions.count_documents({})
            print(f"[*] MongoDB contains {count} customer record(s)")
    except Exception as e:
        print(f"Error checking collection: {str(e)}")
    
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)