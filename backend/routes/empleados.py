from flask import Blueprint, request, jsonify
from supabase_client import supabase
from middleware import token_required  # Seguridad con token

empleados_bp = Blueprint('empleados', __name__)

# =========================
# --- RUTAS PARA CARGOS ---
# =========================

@empleados_bp.route('/cargos', methods=['GET'])
@token_required
def get_cargos():
    try:
        response = supabase.table('cargos').select('*').execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@empleados_bp.route('/cargos', methods=['POST'])
def add_cargo():
    try:
        data = request.get_json()

        if not data or 'nombre_cargo' not in data:
            return jsonify({"error": "Falta 'nombre_cargo'"}), 400

        # Validar duplicado
        existe = supabase.table('cargos')\
            .select('*')\
            .eq('nombre_cargo', data['nombre_cargo'])\
            .execute()

        if existe.data:
            return jsonify({"msg": "El cargo ya existe"}), 200

        response = supabase.table('cargos').insert({
            "nombre_cargo": data['nombre_cargo']
        }).execute()

        return jsonify({
            "msg": "Cargo creado",
            "data": response.data
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================
# --- RUTAS PARA EMPLEADOS ---
# ============================

@empleados_bp.route('/', methods=['GET'])
@token_required
def get_empleados():
    try:
        response = supabase.table('empleados').select(
            '*, cargos(nombre_cargo)'
        ).execute()

        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@empleados_bp.route('/', methods=['POST'])
def add_empleado():
    try:
        data = request.get_json()

        required_fields = [
            'id_empresa', 'nombre', 'id_cargo',
            'sueldo_base', 'pin_tarjeta',
            'hora_entrada', 'hora_salida'
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Falta {field}"}), 400

        nuevo_empleado = {
            "id_empresa": data['id_empresa'],
            "nombre": data['nombre'],
            "telefono": data.get('telefono'),
            "correo": data.get('correo'),
            "id_cargo": data['id_cargo'],
            "sueldo_base": data['sueldo_base'],
            "pin_tarjeta": data['pin_tarjeta'],
            "hora_entrada": data['hora_entrada'],
            "hora_salida": data['hora_salida'],
            "tipo_pago": data.get('tipo_pago', 'mensual'),
            "pago_hora_extra": data.get('pago_hora_extra', 0)
        }

        response = supabase.table('empleados').insert(nuevo_empleado).execute()

        return jsonify({
            "msg": "Empleado registrado con éxito",
            "data": response.data
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# --- EDITAR EMPLEADO ---
# =========================

@empleados_bp.route('/<int:id_empleado>', methods=['PUT'])
@token_required
def update_empleado(id_empleado):
    try:
        data = request.json

        campos_a_actualizar = {
            "nombre": data.get('nombre'),
            "telefono": data.get('telefono'),
            "correo": data.get('correo'),
            "id_cargo": data.get('id_cargo'),
            "sueldo_base": data.get('sueldo_base'),
            "pin_tarjeta": data.get('pin_tarjeta'),
            "hora_entrada": data.get('hora_entrada'),
            "hora_salida": data.get('hora_salida'),
            "pago_hora_extra": data.get('pago_hora_extra')
        }

        update_data = {k: v for k, v in campos_a_actualizar.items() if v is not None}

        if not update_data:
            return jsonify({"error": "No hay datos para actualizar"}), 400

        response = supabase.table('empleados')\
            .update(update_data)\
            .eq('id_empleado', id_empleado)\
            .execute()

        if not response.data:
            return jsonify({"error": "Empleado no encontrado"}), 404

        return jsonify({
            "msg": "Datos actualizados",
            "data": response.data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# --- ELIMINAR EMPLEADO ---
# =========================

@empleados_bp.route('/<int:id_empleado>', methods=['DELETE'])
@token_required
def delete_empleado(id_empleado):
    try:
        response = supabase.table('empleados')\
            .delete()\
            .eq('id_empleado', id_empleado)\
            .execute()

        if not response.data:
            return jsonify({"error": "Empleado no encontrado"}), 404

        return jsonify({"msg": "Empleado eliminado correctamente"}), 200

    except Exception as e:
        return jsonify({
            "error": "No se puede eliminar: tiene registros vinculados",
            "detalle": str(e)
        }), 400