@app.route('/api/auth/register', methods=['POST'])
@app.route('/api/auth/signup', methods=['POST'])
def register():
    try:
        print("--- Signup Request Received ---")
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        # Fix Variable: correctly assigned from request payload
        owner_name = data.get('ownerName') or ''
        shop_name = data.get('shopName') or ''
        location = data.get('location') or ''

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

        if users_collection.find_one({'email': email}):
            return jsonify({'success': False, 'error': 'Account already exists.'}), 400

        shop_owner_id = str(uuid.uuid4())
        shop_owner = {
            'email': email,
            'password_hash': _hash_password(password),
            'shop_id': shop_owner_id,
            'shop_name': shop_name, # Mapping frontend shopName to backend shop_name
            'owner_name': owner_name,
            'location': location,
            'created_at': datetime.utcnow()
        }
        users_collection.insert_one(shop_owner)

        # Ensure all keys from frontend are correctly mapped
        extra_claims = {
            'ownerName': owner_name,
            'shopName': shop_name,
            'location': location
        }
        token = _create_access_token(shop_owner_id, email, extra_claims=extra_claims)

        # Clean Response: return success and necessary auth data
        return jsonify({
            'success': True,
            'accessToken': token,
            'shopId': shop_owner_id,
            'shopName': shop_name,
            'ownerName': owner_name
        }), 201
    except Exception as e:
        print(f"--- Signup Error: {str(e)} ---")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Internal Server Error: {str(e)}'}), 500
