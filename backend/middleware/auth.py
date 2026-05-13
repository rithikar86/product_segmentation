import jwt
import os
from flask import request, jsonify, g
from functools import wraps

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if 'Authorization' header exists
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header

        if not token:
            return jsonify({'message': 'Authentication token is missing!'}), 401

        try:
            # Decode the JWT token using the Secret Key in your .env
            data = jwt.decode(token, os.getenv('JWT_SECRET', 'change-this-secret'), algorithms=["HS256"])
            # Inject the shop_id into the global request object 'g'
            g.shop_id = data['shopId']
        except Exception as e:
            return jsonify({'message': 'Token is invalid or expired!', 'error': str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated