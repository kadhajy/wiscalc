import re
import os
from csv import reader, DictReader
from datetime import datetime

# CALCULANDO PONTOS PONDERADOS

def escolhe_arquivo(anos, meses):
    idade = (int(anos) * 12) + meses;
    arquivos = os.listdir("./correcao")
    
    for aq in arquivos:
        n = [int(n) for n in re.findall(r'\d+', aq)]
        range_idade = [((n[0]*12) + n[1]), ((n[2]*12) + n[3])]
        # checa se a idade esta dentro do range do arquivo
        if idade >= range_idade[0] and idade <= range_idade[1]:
            return aq         
    return False

def calcula_dados(aq, formulario):
    # Abrindo CSV de referência
    with open(f'./correcao/{aq}', "r") as aq_csv:
        dados = DictReader(aq_csv, delimiter=',')
        l_dados = list(dados)

    l_dados = transforma_tabela(l_dados)

    pp = {}
    pp['CB'] = encontra_pp('CB', formulario['CB'], l_dados)
    pp['SM'] = encontra_pp('SM', formulario['SM'], l_dados)
    pp['DG'] = encontra_pp('DG', formulario['DG'], l_dados)
    pp['CN'] = encontra_pp('CN', formulario['CN'], l_dados)
    pp['CD'] = encontra_pp('CD', formulario['CD'], l_dados)
    pp['VC'] = encontra_pp('VC', formulario['VC'], l_dados)
    pp['SNL'] = encontra_pp('SNL', formulario['SNL'], l_dados)
    pp['RM'] = encontra_pp('RM', formulario['RM'], l_dados)
    pp['CO'] = encontra_pp('CO', formulario['CO'], l_dados)
    pp['PS'] = encontra_pp('PS', formulario['PS'], l_dados)
    pp['CF'] = encontra_pp('CF', formulario['CF'], l_dados)
    pp['CA'] = encontra_pp('CA', formulario['CA'], l_dados)
    pp['IN'] = encontra_pp('IN', formulario['IN'], l_dados)
    pp['AR'] = encontra_pp('AR', formulario['AR'], l_dados)
    pp['RP'] = encontra_pp('RP', formulario['RP'], l_dados)
    
    soma = 0
    for i in pp.keys():
        if isinstance(pp[i], int):
            soma = soma + pp[i]
    pp["total"] = soma
    pp["ICV"] = pp["SM"] + pp["VC"] + pp["CO"] + pp["IN"] + pp["RP"]
    pp["IOP"] = pp["CB"] + pp["CN"] + pp["RM"] + pp["CF"]
    pp["IMO"] = pp["DG"] + pp["SNL"] + pp["AR"]
    pp["IVP"] = pp["CD"] + pp["PS"] + pp["CA"]

    return pp    


def encontra_pp(coluna, nota, tabela):
    if nota == '' or nota == None: return 0
    for item in tabela:
        if item[coluna] is None:
            pass
        elif isinstance(item[coluna], int):
            if item[coluna] == int(nota):
                return int(item['PP'])
        elif isinstance(item[coluna], list):
            if int(nota) in item[coluna]:
                return int(item['PP'])
        else:
            return 'VTC'
    

def transforma_tabela(lista_dicionario):
    #dici = {'PP': '1', 'CB': '0', 'SM': '', 'DG': '0-4', 'CN': '0-1', 'CD': '0-9', 'VC': '0-6', 'SNL': '0', 'RM': '0-3', 'CO': '0-1', 'PS': '0', 'PP2': '1', 'CF': '0-2', 'CA': '0-18', 'IN': '0-4', 'AR': '0-6', 'RP': '0-1'}
    lista_corrigida = []
    for item in lista_dicionario:
        for key in item.keys():
            if item[key] == "":
                item[key] = None
            elif item[key].isdigit():
                item[key] = int(item[key].strip())
            elif "-" in item[key]:
                #inicio, fim = map(int, item[key].split('-'))
                inicio = int(item[key].strip().split("-")[0])
                fim = int(item[key].strip().split("-")[1])
                item[key] = list(range(inicio, (fim + 1)))
        lista_corrigida.append(item)
    return lista_corrigida

# FIM CALCULANDO PONTOS PONDERADOS

# INICIO CONV EM PONTOS COMPOSTOS
def convert_pc(pp):
    icv = encontra_dados_pc(pp["ICV"], "ICV")
    iop = encontra_dados_pc(pp["IOP"], "IOP")
    imo = encontra_dados_pc(pp["IMO"], "IMO")
    ivp = encontra_dados_pc(pp["IVP"], "IVP")
    qit = encontra_dados_pc(pp["total"], "QIT")
    
    
    return {"pc_icv": icv, "pc_iop": iop, "pc_imo": imo, "pc_ivp": ivp, "pc_qit": qit}

def encontra_dados_pc(spp, indice):
    with open(f"./conv/{indice}.csv", "r") as aq_csv:
        dados = DictReader(aq_csv, delimiter=',')
        l_dados = list(dados)
    
    for item in l_dados:
        if item["SPP"].strip() == str(spp):
            return item
# FIM CONV EM PONTOS COMPOSTOS

def calcular_idade(data_nascimento_str, data_base_str):
    nascimento = datetime.strptime(data_nascimento_str, '%Y-%m-%d')
    data_base = datetime.strptime(data_base_str, '%Y-%m-%d')

    anos = data_base.year - nascimento.year
    meses = data_base.month - nascimento.month

    if meses < 0:
        anos -= 1
        meses += 12

    return anos, meses

def corrigi_teste(d_form):
    # calcular idade e meses
    anos, meses = calcular_idade(d_form['nascimento'], d_form['data_apli'])
    arquivo = escolhe_arquivo(anos, meses)
    pp = calcula_dados(arquivo, d_form)
    pp['anos_meses'] = f"{anos} anos e {meses} meses"
    pp['pc'] = convert_pc(pp)
    #pc = calcula_pc(pp)

    # RETORNA pp PARA MONTAR A TABELA 
    return pp

if __name__ == "__main__":
    anos, meses = calcular_idade("2015-03-20", "2023-12-20")
    print(f"anos{anos} meses{meses}")







