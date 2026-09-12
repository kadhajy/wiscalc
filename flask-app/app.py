from flask import Flask, request, render_template
import calc
from datetime import datetime
import webbrowser

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():
    dados = request.form.to_dict()  # captura todos os dados do formulário
    pp = calc.corrigi_teste(dados)
    return render_template('resultado.html', pp=pp, dados=dados)

if __name__ == '__main__':
    # Para testes
    #app.run(debug=True)
    
    # Para producao
    app.run(host='0.0.0.0', port='5000', debug='True')
    