# Usa uma imagem oficial do Python
FROM python:3.13-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos para dentro da imagem
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expõe a porta em que o Flask roda
EXPOSE 5000

# Comando para rodar a aplicação Flask
CMD ["python3", "app.py"]
