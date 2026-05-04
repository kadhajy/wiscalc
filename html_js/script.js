function calcularResultados() {
    const nome = document.getElementById("nome").value;
    const nascimento = new Date(document.getElementById("nascimento").value);
    const aplicacao = new Date(document.getElementById("aplicacao").value);
  
    let anos = aplicacao.getFullYear() - nascimento.getFullYear();
    let meses = aplicacao.getMonth() - nascimento.getMonth();
    if (meses < 0) {
      anos--;
      meses += 12;
    }
  
    const subtestes = ["CB", "SM", "DG", "CN", "CD", "SNL", "RM", "CO", "PS", "CF", "CA", "IN", "AR", "RP"];
    const resultados = {};
  
    fetch("correcao/indice.csv")
      .then(res => res.text())
      .then(indiceCSV => {
        const linhas = indiceCSV.trim().split("\n");
        let arquivoCorreto = null;
        const idadePaciente = anos * 12 + meses;
  
        for (const linha of linhas) {
          const nomeArquivo = linha.trim();
          const match = nomeArquivo.match(/(\d+)a(\d+)m-(\d+)a(\d+)m/);
          if (match) {
            const [_, aInicio, mInicio, aFim, mFim] = match.map(Number);
            const idadeInicio = aInicio * 12 + mInicio;
            const idadeFim = aFim * 12 + mFim;
  
            if (idadePaciente >= idadeInicio && idadePaciente <= idadeFim) {
              arquivoCorreto = nomeArquivo;
              break;
            }
          }
        }
  
        if (!arquivoCorreto) {
          alert("Nenhum arquivo de correção adequado encontrado para esta idade.");
          return;
        }
  
        fetch(`correcao/${arquivoCorreto}`)
          .then(res => res.text())
          .then(csvText => {
            const linhasCSV = csvText.trim().split("\n");
            const headers = linhasCSV[0].split(",").map(h => h.trim());
            const dados = linhasCSV.slice(1).map(l => l.split(",").map(v => v.trim()));
  
            for (const subteste of subtestes) {
              const input = document.querySelector(`[name="${subteste}"]`);
              if (!input || input.value === "") continue;
  
              const valorUsuario = parseInt(input.value);
              const idxSubteste = headers.indexOf(subteste);
              const idxPP = headers.indexOf("PP");
  
              let ppEncontrado = null;
  
              for (const linha of dados) {
                const valorCSV = linha[idxSubteste];
                if (!valorCSV) continue;
  
                if (valorCSV.includes("-")) {
                  const [min, max] = valorCSV.split("-").map(Number);
                  if (valorUsuario >= min && valorUsuario <= max) {
                    ppEncontrado = linha[idxPP];
                    break;
                  }
                } else if (parseInt(valorCSV) === valorUsuario) {
                  ppEncontrado = linha[idxPP];
                  break;
                }
              }
  
              resultados[subteste] = ppEncontrado !== null ? ppEncontrado : "Não encontrado";
            }
  
            // Montar e exibir o alert
            let mensagem = `Nome: ${nome}\n`;
            mensagem += `Idade: ${anos} anos e ${meses} meses\n`;
            mensagem += `Arquivo usado: ${arquivoCorreto}\n\n`;
            mensagem += `Conversões (PP):\n`;
  
            for (const [subteste, pp] of Object.entries(resultados)) {
              mensagem += `${subteste}: ${pp}\n`;
            }
  
            alert(mensagem);
          });
      });
  }
  