from flask import Flask, request, send_file, jsonify
from PyPDF2 import PdfMerger
import os
import time
from flask_cors import CORS  # Importando o CORS

app = Flask(__name__)

# Habilitando CORS para todos os domínios
CORS(app)

UPLOAD_FOLDER = 'uploads'
MERGED_FOLDER = 'merged'

# Criar diretórios se não existirem
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MERGED_FOLDER, exist_ok=True)

@app.route('/merge-pdfs', methods=['POST'])
def merge_pdfs():
    try:
        if 'pdfs' not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado."}), 400

        files = request.files.getlist('pdfs')
        if not files:
            return jsonify({"error": "Nenhum arquivo enviado."}), 400

        merger = PdfMerger()

        # Salvar os arquivos e adicionar ao merger
        for file in files:
            if file.content_type != 'application/pdf':
                return jsonify({"error": f"Arquivo {file.filename} não é um PDF válido."}), 400

            filepath = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(filepath)
            merger.append(filepath)

        # Gerar o PDF combinado
        merged_filename = f'merged-{int(time.time())}.pdf'
        merged_filepath = os.path.join(MERGED_FOLDER, merged_filename)
        merger.write(merged_filepath)
        merger.close()

        # Limpar arquivos temporários
        for file in files:
            os.remove(os.path.join(UPLOAD_FOLDER, file.filename))

        return send_file(merged_filepath, as_attachment=True, download_name="merged.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=3001, debug=True)
