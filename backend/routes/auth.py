from flask import Blueprint, request, jsonify
from supabase_client import supabase

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email y contraseña requeridos"}), 400

    try:
        # 🔐 Login con Supabase Auth
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if not response.user:
            return jsonify({"error": "Credenciales inválidas"}), 401

        # 🔥 tabla en minúscula
        empresa_data = supabase.table('empresas')\
            .select('*')\
            .eq('correo', email)\
            .execute()

        if not empresa_data.data:
            return jsonify({"error": "Empresa no encontrada"}), 404

        empresa = empresa_data.data[0]

        return jsonify({
            "message": "Login exitoso",
            "token": response.session.access_token,
            "user": {
                "id": empresa['id_empresa'],
                "nombre": empresa['nombre'],
                "correo": empresa['correo']
            }
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Credenciales inválidas",
            "details": str(e)
        }), 401


@auth_bp.route('/perfil', methods=['GET'])
def get_perfil():
    return jsonify({
        "msg": "Ruta protegida para ver datos de la empresa"
    })