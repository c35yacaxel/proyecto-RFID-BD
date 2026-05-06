from flask import Blueprint, jsonify
from supabase_client import supabase
from middleware import token_required

reportes_bp = Blueprint('reportes', __name__)

# 1. Reporte de Asistencia Diaria (¿Quién vino hoy?)
@reportes_bp.route('/asistencia-hoy', methods=['GET'])
@token_required
def asistencia_hoy():
    try:
        from datetime import datetime
        fecha_actual = datetime.now().date().isoformat()
        
        response = supabase.table('registrosasistencia')\
            .select('hora_entrada, hora_salida, empleados(nombre, cargos(nombre_cargo))')\
            .eq('fecha', fecha_actual)\
            .execute()
            
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. Historial de Pagos Totales (Resumen contable)
@reportes_bp.route('/historial-pagos', methods=['GET'])
@token_required
def historial_pagos():
    try:
        # Traemos los pagos realizados cruzando con el nombre del empleado
        response = supabase.table('pagostotales')\
            .select('fecha_pago, monto_total, estado, empleados(nombre)')\
            .order('fecha_pago', desc=True)\
            .execute()
            
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Reporte de Horas Extra por Empleado
@reportes_bp.route('/resumen-horas-extra', methods=['GET'])
@token_required
def resumen_horas_extra():
    try:
        # Buscamos en pagosdiarios los que tienen horas extra > 0
        response = supabase.table('pagosdiarios')\
            .select('fecha, horas_extra, empleados(nombre)')\
            .gt('horas_extra', 0)\
            .order('fecha', desc=True)\
            .execute()
            
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500