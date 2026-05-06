from flask import Blueprint, request, jsonify
from supabase_client import supabase
from datetime import datetime

asistencia_bp = Blueprint('asistencia', __name__)

@asistencia_bp.route('/marcar', methods=['GET'])
def marcar_asistencia():
    uid = request.args.get('uid')
    
    if not uid:
        return jsonify({"status": "error", "message": "UID no recibido"}), 400

    try:
        # Buscar empleado por pin_tarjeta
        empleado = supabase.table('empleados').select('id_empleado, nombre').eq('pin_tarjeta', uid).execute()
        
        if not empleado.data:
            return jsonify({"status": "error", "message": "Tarjeta no registrada"}), 404
        
        id_emp = empleado.data[0]['id_empleado']
        nombre_emp = empleado.data[0]['nombre']
        fecha_hoy = datetime.now().date().isoformat()
        hora_actual = datetime.now().strftime("%H:%M:%S")

        # Verificar si ya existe registro hoy
        registro = supabase.table('registrosasistencia')\
            .select('*')\
            .eq('id_empleado', id_emp)\
            .eq('fecha', fecha_hoy)\
            .execute()

        if not registro.data:
            # Entrada: El Trigger no se activa aquí
            supabase.table('registrosasistencia').insert({
                "id_empleado": id_emp,
                "fecha": fecha_hoy,
                "hora_entrada": hora_actual
            }).execute()
            return jsonify({"status": "success", "user": nombre_emp, "msg": "Entrada registrada"}), 200
        
        else:
            # Salida: AL HACER ESTE UPDATE, EL TRIGGER DE SUPABASE CALCULA EL PAGO AUTOMÁTICAMENTE
            id_reg = registro.data[0]['id_registro']
            supabase.table('registrosasistencia').update({
                "hora_salida": hora_actual
            }).eq('id_registro', id_reg).execute()
            
            return jsonify({"status": "success", "user": nombre_emp, "msg": "Salida registrada y pago calculado por el sistema"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500