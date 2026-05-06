from flask import request, jsonify
from functools import wraps
from supabase_client import supabase

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # Formato esperado: Bearer <JWT_TOKEN>
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({"error": "Acceso denegado. Token faltante."}), 401
        
        try:
            # Verificamos el token con el servicio de Auth de Supabase
            user = supabase.auth.get_user(token)
            if user:
                return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Token inválido o expirado"}), 401
            
    return decorated