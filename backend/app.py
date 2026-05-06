from flask import Flask
from flask_cors import CORS
import os

from routes.auth import auth_bp
from routes.empleados import empleados_bp
from routes.asistencia import asistencia_bp
from routes.pagos import pagos_bp
from routes.reportes import reportes_bp 

app = Flask(__name__)

# Permite peticiones desde cualquier origen (frontend en Vercel)
CORS(app)

# Registro de Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(empleados_bp, url_prefix='/api/empleados')
app.register_blueprint(asistencia_bp, url_prefix='/api/asistencia')
app.register_blueprint(pagos_bp, url_prefix='/api/pagos')
app.register_blueprint(reportes_bp, url_prefix='/api/reportes')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)