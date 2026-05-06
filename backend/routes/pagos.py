from flask import Blueprint, request, jsonify
from supabase_client import supabase
from datetime import datetime, timedelta

pagos_bp = Blueprint('pagos', __name__)

@pagos_bp.route('/cerrar-nomina', methods=['POST'])
def cerrar_nomina():
    data = request.json
    id_emp = data.get('id_empleado')
    
    try:
        # 1. Obtener datos del empleado y su día de descanso
        emp_req = supabase.table('empleados').select('*').eq('id_empleado', id_emp).single().execute()
        empleado = emp_req.data
        
        # 2. Obtener registros pendientes de RFID
        diarios_req = supabase.table('pagosdiarios')\
            .select('*').eq('id_empleado', id_emp).is_('id_pago_total', 'null').execute()
        
        registros_diarios = diarios_req.data
        if not registros_diarios:
            return jsonify({"msg": "No hay días pendientes de pago"}), 400

        # --- LÓGICA DE CALENDARIO Y DESCANSO ---
        sueldo_diario = empleado['sueldo_base'] / 30
        
        # Determinamos el rango de fechas para buscar descansos
        todas_las_fechas = [datetime.strptime(r['fecha'], '%Y-%m-%d') for r in registros_diarios]
        fecha_min = min(todas_las_fechas)
        fecha_max = max(todas_las_fechas)
        
        dias_descanso_pagados = 0
        current_date = fecha_min
        
        # Recorremos el calendario desde el primer día al último
        while current_date <= fecha_max:
            # .weekday() devuelve 0 para Lunes, 6 para Domingo
            if current_date.weekday() == empleado['dia_descanso']:
                dias_descanso_pagados += 1
            current_date += timedelta(days=1)

        # --- CÁLCULO FINAL ---
        total_pago_asistencia = 0
        total_extras = 0
        
        for r in registros_diarios:
            if r['horas_trabajadas'] >= 8:
                total_pago_asistencia += sueldo_diario
            else:
                total_pago_asistencia += (sueldo_diario * (r['horas_trabajadas'] / 8))
            
            total_extras += (r['horas_extra'] * empleado['pago_hora_extra'])

        # Sumamos el pago de los días de descanso que cayeron en este periodo
        pago_por_descansos = dias_descanso_pagados * sueldo_diario
        monto_final = total_pago_asistencia + pago_por_descansos + total_extras

        # 3. Guardar Pago Total
        pago_total_req = supabase.table('pagostotales').insert({
            "id_empleado": id_emp,
            "fecha_inicio": fecha_min.date().isoformat(),
            "fecha_fin": fecha_max.date().isoformat(),
            "total_pago": round(monto_final, 2)
        }).execute()
        
        id_pago_gen = pago_total_req.data[0]['id_pago_total']

        # 4. Marcar registros como pagados
        for r in registros_diarios:
            supabase.table('pagosdiarios').update({"id_pago_total": id_pago_gen}).eq('id_pago', r['id_pago']).execute()

        return jsonify({
            "msg": "Nómina cerrada con éxito",
            "detalles": {
                "dias_trabajados": len(registros_diarios),
                "dias_descanso_incluidos": dias_descanso_pagados,
                "pago_descansos": round(pago_por_descansos, 2),
                "total_final": round(monto_final, 2)
            }
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500