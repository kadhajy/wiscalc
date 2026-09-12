// Porta em JavaScript puro a lógica de correção do WISC-IV que, na versão
// Flask, vive em calc.py. Mantém o mesmo fluxo em duas etapas:
//   1) pontuação bruta -> pontos ponderados (PP), usando as tabelas de
//      correcao/ por faixa etária.
//   2) PP -> índices compostos -> pontos compostos (PC), usando as tabelas
//      de conv/.

const SUBTESTES = [
  "CB", "SM", "DG", "CN", "CD", "VC", "SNL", "RM",
  "CO", "PS", "CF", "CA", "IN", "AR", "RP",
];

const LABELS_SUBTESTES = {
  CB: "Cubos (CB)",
  SM: "Semelhanças (SM)",
  DG: "Dígitos (DG)",
  CN: "Conceitos Figurativos (CN)",
  CD: "Código (CD)",
  VC: "Vocabulário (VC)",
  SNL: "Sequência de Números e Letras (SNL)",
  RM: "Raciocínio Matricial (RM)",
  CO: "Compreensão (CO)",
  PS: "Procurar Símbolos (PS)",
  CF: "Completar Figuras (CF)",
  CA: "Cancelamento (CA)",
  IN: "Informação (IN)",
  AR: "Aritmética (AR)",
  RP: "Raciocínio com Palavras (RP)",
};

// Equivalente a os.listdir("./correcao") em calc.py: como uma página
// estática não pode listar diretórios, os nomes dos arquivos são embutidos
// aqui, refletindo exatamente o conteúdo de correcao/.
const ARQUIVOS_CORRECAO = [
  "10a0m-10a3m.csv", "10a4m-10a7m.csv", "10a8m-10a11m.csv",
  "11a0m-11a3m.csv", "11a4m-11a7m.csv", "11a8m-11a11m.csv",
  "12a0m-12a3m.csv", "12a4m-12a7m.csv", "12a8m-12a11m.csv",
  "13a0m13a3m.csv", "13a4m-13a7m.csv", "13a8m-13a11m.csv",
  "14a0m-14a3m.csv", "14a4m-14a7m.csv", "14a8m-14a11m.csv",
  "15a0m-15a3m.csv", "15a4m-15a7m.csv", "15a8m-15a11m.csv",
  "16a0m-16a3m.csv", "16a4m-16a7m.csv", "16a8m-16a11m.csv",
  "6a0m6a3m.csv", "6a4m6a7m.csv", "6a8m6a11m.csv",
  "7a0m7a3m.csv", "7a4m7a7m.csv", "7a8m7a11m.csv",
  "8a0m-8a3m.csv", "8a4m-8a7m.csv", "8a8m-8a11m.csv",
  "9a0m-9a3m.csv", "9a4m-9a7m.csv", "9a8m-9a11m.csv",
];

// ---------- CALCULANDO PONTOS PONDERADOS ----------

function calcularIdade(dataNascimentoStr, dataBaseStr) {
  const nascimento = new Date(dataNascimentoStr + "T00:00:00");
  const dataBase = new Date(dataBaseStr + "T00:00:00");

  let anos = dataBase.getFullYear() - nascimento.getFullYear();
  let meses = (dataBase.getMonth() + 1) - (nascimento.getMonth() + 1);

  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  return { anos, meses };
}

function escolheArquivo(anos, meses) {
  const idade = anos * 12 + meses;

  for (const aq of ARQUIVOS_CORRECAO) {
    const n = (aq.match(/\d+/g) || []).map(Number);
    const rangeIdade = [(n[0] * 12) + n[1], (n[2] * 12) + n[3]];
    if (idade >= rangeIdade[0] && idade <= rangeIdade[1]) {
      return aq;
    }
  }
  return null;
}

function parseCSV(texto) {
  const linhas = texto.trim().split(/\r?\n/);
  const cabecalho = linhas[0].split(",");
  const linhasDados = linhas.slice(1);

  return linhasDados.map((linha) => {
    const valores = linha.split(",");
    const item = {};
    cabecalho.forEach((chave, i) => {
      item[chave] = valores[i] !== undefined ? valores[i] : "";
    });
    return item;
  });
}

function transformaTabela(listaDicionario) {
  const listaCorrigida = [];

  for (const itemOriginal of listaDicionario) {
    const item = { ...itemOriginal };
    for (const chave of Object.keys(item)) {
      const valor = item[chave];
      if (valor === "") {
        item[chave] = null;
      } else if (/^\d+$/.test(valor.trim())) {
        item[chave] = parseInt(valor.trim(), 10);
      } else if (valor.includes("-")) {
        const [inicio, fim] = valor.trim().split("-").map(Number);
        const intervalo = [];
        for (let v = inicio; v <= fim; v++) intervalo.push(v);
        item[chave] = intervalo;
      }
    }
    listaCorrigida.push(item);
  }

  return listaCorrigida;
}

function encontraPP(coluna, nota, tabela) {
  if (nota === "" || nota === null || nota === undefined) return 0;

  for (const item of tabela) {
    const valor = item[coluna];
    if (valor === null) {
      continue;
    } else if (typeof valor === "number") {
      if (valor === parseInt(nota, 10)) return parseInt(item["PP"], 10);
    } else if (Array.isArray(valor)) {
      if (valor.includes(parseInt(nota, 10))) return parseInt(item["PP"], 10);
    } else {
      return "VTC";
    }
  }
  return undefined;
}

function calculaDados(textoCsv, formulario) {
  const dados = transformaTabela(parseCSV(textoCsv));

  const pp = {};
  for (const coluna of SUBTESTES) {
    pp[coluna] = encontraPP(coluna, formulario[coluna], dados);
  }

  let soma = 0;
  for (const chave of Object.keys(pp)) {
    if (typeof pp[chave] === "number") soma += pp[chave];
  }
  pp["total"] = soma;
  pp["ICV"] = pp["SM"] + pp["VC"] + pp["CO"] + pp["IN"] + pp["RP"];
  pp["IOP"] = pp["CB"] + pp["CN"] + pp["RM"] + pp["CF"];
  pp["IMO"] = pp["DG"] + pp["SNL"] + pp["AR"];
  pp["IVP"] = pp["CD"] + pp["PS"] + pp["CA"];

  return pp;
}

// ---------- FIM CALCULANDO PONTOS PONDERADOS ----------

// ---------- CONV EM PONTOS COMPOSTOS ----------

async function encontraDadosPC(spp, indice) {
  const resposta = await fetch(`conv/${indice}.csv`);
  const texto = await resposta.text();
  const linhas = parseCSV(texto);

  for (const item of linhas) {
    if (item["SPP"].trim() === String(spp)) return item;
  }
  return undefined;
}

async function convertPC(pp) {
  const [icv, iop, imo, ivp, qit] = await Promise.all([
    encontraDadosPC(pp["ICV"], "ICV"),
    encontraDadosPC(pp["IOP"], "IOP"),
    encontraDadosPC(pp["IMO"], "IMO"),
    encontraDadosPC(pp["IVP"], "IVP"),
    encontraDadosPC(pp["total"], "QIT"),
  ]);

  return { pc_icv: icv, pc_iop: iop, pc_imo: imo, pc_ivp: ivp, pc_qit: qit };
}

// ---------- FIM CONV EM PONTOS COMPOSTOS ----------

async function corrigiTeste(dForm) {
  const { anos, meses } = calcularIdade(dForm["nascimento"], dForm["data_apli"]);
  const arquivo = escolheArquivo(anos, meses);
  if (!arquivo) {
    throw new Error("Não foi encontrada uma tabela de correção para essa idade.");
  }

  const respostaCsv = await fetch(`correcao/${arquivo}`);
  const textoCsv = await respostaCsv.text();

  const pp = calculaDados(textoCsv, dForm);
  pp["anos_meses"] = `${anos} anos e ${meses} meses`;
  pp["pc"] = await convertPC(pp);

  return pp;
}

// ---------- RENDERIZAÇÃO DA PÁGINA ----------

function renderizaResultado(pp, dados) {
  document.getElementById("r-nome").textContent = dados["nome"];
  document.getElementById("r-nascimento").textContent = dados["nascimento"];
  document.getElementById("r-data-apli").textContent = dados["data_apli"];
  document.getElementById("r-idade").textContent = pp["anos_meses"];

  const corpoSubtestes = document.getElementById("r-subtestes");
  corpoSubtestes.innerHTML = "";
  for (const coluna of SUBTESTES) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${LABELS_SUBTESTES[coluna]}</td><td>${dados[coluna] ?? ""}</td><td>${pp[coluna] ?? ""}</td>`;
    corpoSubtestes.appendChild(tr);
  }
  const trTotal = document.createElement("tr");
  trTotal.className = "table-secondary";
  trTotal.innerHTML = `<td><strong>Soma dos Pontos Ponderados:</strong></td><td></td><td><strong>${pp["total"]}</strong></td>`;
  corpoSubtestes.appendChild(trTotal);

  const corpoSomas = document.getElementById("r-somas");
  corpoSomas.innerHTML = "";
  for (const esc of ["ICV", "IOP", "IMO", "IVP", "total"]) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${esc}</strong></td><td>${pp[esc]}</td>`;
    corpoSomas.appendChild(tr);
  }

  const corpoPc = document.getElementById("r-pc");
  corpoPc.innerHTML = "";
  for (const escala of ["icv", "iop", "imo", "ivp", "qit"]) {
    const escalaUpper = escala.toUpperCase();
    const pc = pp["pc"]["pc_" + escala];
    const somaPp = escala === "qit" ? pp["total"] : pp[escalaUpper];
    const rotulo = escala === "qit" ? "QI Total" : escalaUpper;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rotulo}</td>
      <td>${somaPp}</td>
      <td>${escalaUpper} ${pc ? pc[escalaUpper] : ""}</td>
      <td>${pc ? pc["rank_p"] : ""}</td>
      <td>${pc ? pc["nc95"] : ""}</td>
    `;
    corpoPc.appendChild(tr);
  }
}

function mostraErro(mensagem) {
  const caixaErro = document.getElementById("erro");
  caixaErro.textContent = mensagem;
  caixaErro.classList.remove("d-none");
}

function escondeErro() {
  document.getElementById("erro").classList.add("d-none");
}

document.getElementById("form-wisc").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  escondeErro();

  const formData = new FormData(evento.target);
  const dados = Object.fromEntries(formData.entries());

  try {
    const pp = await corrigiTeste(dados);
    renderizaResultado(pp, dados);
    document.getElementById("secao-formulario").classList.add("d-none");
    document.getElementById("secao-resultado").classList.remove("d-none");
  } catch (erro) {
    mostraErro(erro.message);
  }
});

document.getElementById("btn-novo-calculo").addEventListener("click", () => {
  document.getElementById("secao-resultado").classList.add("d-none");
  document.getElementById("secao-formulario").classList.remove("d-none");
});
