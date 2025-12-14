// --- VARIÁVEIS GLOBAIS ---
let jogo = new Chess(); 
let tabuleiroDiv = document.getElementById('tabuleiro');
let casaSelecionada = null;
let botAtivo = true;
// Define quem está na parte inferior do tabuleiro ('w' para Brancas na base, 'b' para Pretas na base)
let orientacaoTabuleiro = 'w'; 

// Mapeamento de peças (usando símbolos Unicode)
const pecasUnicode = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
};

// Profundidade de busca da IA
const PROFUNDIDADE_BUSCA = 2; 

// --- FUNÇÕES DE INTERFACE E RENDERIZAÇÃO (COM INVERSÃO) ---

function desenharTabuleiro() {
    tabuleiroDiv.innerHTML = ''; // Limpa o tabuleiro e as coordenadas

    // Configura a ordem de iteração para renderizar de acordo com a orientação
    const ranks = (orientacaoTabuleiro === 'w') ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = (orientacaoTabuleiro === 'w') ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    
    // 1. Criar o contêiner interno que terá as 64 casas
    const gridCasas = document.createElement('div');
    gridCasas.className = 'tabuleiro-grid';

    const casas = jogo.board();
    
    // 2. Criar e adicionar as 64 casas internas ao gridCasas
    for (const rank of ranks) { 
        // i é o índice do array do chess.js (0 a 7, onde 0 é a linha 8)
        const i = 8 - rank; 
        
        for (const j of files) { // j é o índice da coluna (0 a 7)
            const casa = casas[i][j];
            const nomeCasa = String.fromCharCode(97 + j) + rank; 
            const cor = (i + j) % 2 === 0 ? 'clara' : 'escura';

            const divCasa = document.createElement('div');
            divCasa.className = `casa ${cor}`;
            divCasa.id = nomeCasa;
            divCasa.dataset.square = nomeCasa;
            divCasa.onclick = () => onCasaClick(nomeCasa);

            if (casa) {
                const corClasse = casa.color === 'w' ? 'peca-branca' : 'peca-preta'; 
                divCasa.innerHTML = pecasUnicode[casa.type.toUpperCase()]; 
                divCasa.classList.add(corClasse); 
            }

            gridCasas.appendChild(divCasa); 
        }
    }
    
    // 3. Adicionar o contêiner de casas (gridCasas) ao tabuleiro principal
    tabuleiroDiv.appendChild(gridCasas); 


    // 4. Gerar e adicionar as coordenadas (também invertidas)
    
    // Ranks para Coordenadas (8-1 ou 1-8)
    const ranksCoord = (orientacaoTabuleiro === 'w') ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    for (let idx = 0; idx < 8; idx++) {
        const rank = ranksCoord[idx]; 
        const gridRowPos = idx + 2; // Linhas 2 a 9 (para as casas)

        // Coordenada Esquerda
        const coordEsq = document.createElement('div');
        coordEsq.className = 'coordenada lateral';
        coordEsq.style.gridRow = gridRowPos; 
        coordEsq.textContent = rank;
        tabuleiroDiv.appendChild(coordEsq);
        
        // Coordenada Direita
        const coordDir = document.createElement('div');
        coordDir.className = 'coordenada';
        coordDir.style.gridRow = gridRowPos; 
        coordDir.style.gridColumn = 10;
        coordDir.textContent = rank;
        tabuleiroDiv.appendChild(coordDir);
    }

    // Files para Coordenadas (a-h ou h-a)
    const filesCoord = (orientacaoTabuleiro === 'w') ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    for (let idx = 0; idx < 8; idx++) {
        const j = filesCoord[idx];
        const file = String.fromCharCode(97 + j); 
        const gridColPos = idx + 2; // Colunas 2 a 9 (para as casas)

        // Coordenada Inferior
        const coordInf = document.createElement('div');
        coordInf.className = 'coordenada inferior';
        coordInf.style.gridColumn = gridColPos; 
        coordInf.textContent = file;
        tabuleiroDiv.appendChild(coordInf);
        
        // Coordenada Superior
        const coordSup = document.createElement('div');
        coordSup.className = 'coordenada superior';
        coordSup.style.gridColumn = gridColPos; 
        coordSup.textContent = file;
        tabuleiroDiv.appendChild(coordSup);
    }
    
    // 5. Atualizar o histórico e status
    atualizarStatus();
    atualizarHistorico();
}

function onCasaClick(nomeCasa) {
    limparMarcacoes();
    const divCasa = document.getElementById(nomeCasa);

    if (casaSelecionada === null) {
        const peca = jogo.get(nomeCasa);
        // Permite seleção apenas se a peça for da cor que está jogando
        if (peca && peca.color === jogo.turn()) { 
            casaSelecionada = nomeCasa;
            divCasa.classList.add('selecionada');
            destacarMovimentosValidos(nomeCasa);
        }
    } 
    else {
        const movimento = {
            from: casaSelecionada,
            to: nomeCasa,
            promotion: 'q' 
        };

        const resultado = jogo.move(movimento);

        if (resultado) {
            casaSelecionada = null;
            desenharTabuleiro(); 
            
            // Verifica se é a vez do Bot e ele está ativo
            if (botAtivo && jogo.turn() !== jogadorLocal()) {
                setTimeout(movimentoBotInteligente, 500); 
            }
        } else {
            casaSelecionada = null; 
            onCasaClick(nomeCasa); 
        }
    }
}

// Funções utilitárias para determinar quem é o jogador humano e quem é o bot
function jogadorLocal() {
    // O jogador humano sempre joga com a cor que está na base do tabuleiro
    return orientacaoTabuleiro; 
}

function corBot() {
    return orientacaoTabuleiro === 'w' ? 'b' : 'w'; 
}

function atualizarHistorico() {
    const historicoVerbose = jogo.history({ verbose: true });
    const listaJogadasDiv = document.getElementById('lista-jogadas');
    listaJogadasDiv.innerHTML = '';
    
    let jogadaAtual = 1;

    for (let i = 0; i < historicoVerbose.length; i += 2) {
        const jogadaBranca = historicoVerbose[i];
        const jogadaPreta = historicoVerbose[i + 1];

        const itemDiv = document.createElement('div');
        itemDiv.className = 'jogada-item';

        // Usamos 'san' para a Notação Algébrica Padrão (e4, Nf3, etc.)
        let textoJogada = `<strong>${jogadaAtual}.</strong> W: ${jogadaBranca.san}`;
        
        if (jogadaPreta) {
            textoJogada += ` | B: ${jogadaPreta.san}`;
        }
        
        itemDiv.innerHTML = textoJogada;
        listaJogadasDiv.appendChild(itemDiv);
        jogadaAtual++;
    }
    
    listaJogadasDiv.scrollTop = listaJogadasDiv.scrollHeight;
}

function destacarMovimentosValidos(casa) {
    const movimentos = jogo.moves({ square: casa, verbose: true });
    
    movimentos.forEach(mov => {
        const divAlvo = document.getElementById(mov.to);
        if (divAlvo) {
            divAlvo.classList.add('movimento-valido');
        }
    });
}

function limparMarcacoes() {
    document.querySelectorAll('.selecionada').forEach(el => el.classList.remove('selecionada'));
    document.querySelectorAll('.movimento-valido').forEach(el => el.classList.remove('movimento-valido'));
}

function atualizarStatus() {
    let status = '';
    const corVez = jogo.turn() === 'w' ? 'Brancas' : 'Pretas';
    const nomeVez = jogo.turn() === jogadorLocal() ? 'Você' : 'Bot';

    if (jogo.in_checkmate()) {
        status = `XEQUE-MATE! ${jogo.turn() === 'w' ? 'Pretas' : 'Brancas'} VENCERAM.`;
    } else if (jogo.in_stalemate() || jogo.in_threefold_repetition() || jogo.insufficient_material() || jogo.in_draw()) {
        status = 'JOGO ENCERRADO: EMPATE.';
    } else {
        status = `Vez das ${corVez} (${nomeVez}).`;
        if (jogo.in_check()) {
            status += ' O Rei está em XEQUE!';
        }
    }

    document.getElementById('status').innerText = status;
}

function novoJogo() {
    jogo.reset();
    casaSelecionada = null;
    desenharTabuleiro();
    
    const corVez = jogo.turn() === 'w' ? 'Brancas' : 'Pretas';
    const nomeVez = jogo.turn() === jogadorLocal() ? 'Você' : 'Bot';
    document.getElementById('status').innerText = `Novo jogo iniciado. Vez das ${corVez} (${nomeVez}).`;
    
    // Se o Bot for Brancas e for a vez dele, ele joga o primeiro movimento
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500); 
    }
}

function toggleBot() {
    botAtivo = !botAtivo;
    const btn = document.getElementById('toggle-bot');
    btn.innerText = `Bot ON/OFF (Atual: ${botAtivo ? 'ON' : 'OFF'})`;
    
    // Se ativado e for a vez do Bot
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500); 
    }
}

// Inverte a orientação do tabuleiro e atualiza o botão
function inverterTabuleiro() {
    orientacaoTabuleiro = (orientacaoTabuleiro === 'w') ? 'b' : 'w';
    
    const btn = document.getElementById('toggle-orientacao');
    btn.innerText = `Orientação (Atual: ${orientacaoTabuleiro === 'w' ? 'Brancas' : 'Pretas'})`;
    
    desenharTabuleiro();
    
    // Se for a vez do Bot e a orientação for alterada, o Bot joga
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500);
    } else {
        atualizarStatus(); // Atualiza para mostrar a cor correta do jogador/bot
    }
}

// --- LÓGICA DO BOT INTELIGENTE (IA) ---

// Tabela de Pesos Posicionais (PSTs)
// ... (PSTs mantidas) ...
const pst_p = [
    [0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, -20, -20, 10, 10, 5],
    [5, -5, -10, 0, 0, -10, -5, 5], [0, 0, 0, 20, 20, 0, 0, 0],
    [5, 5, 10, 25, 25, 10, 5, 5], [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50], [0, 0, 0, 0, 0, 0, 0, 0]
];

const pst_n = [
    [-50, -40, -30, -30, -30, -30, -40, -50], [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30], [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30], [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40], [-50, -40, -30, -30, -30, -30, -40, -50]
];

const valoresPeca = {
    'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 
};

//Avalia a posição do tabuleiro. Positivo: bom para o Bot.

function avaliarPosicao(jogo) {
    if (jogo.game_over()) {
        // Se o jogo acabou e é a vez do Bot, ele perdeu (ou empatou). Se não for a vez do Bot, ele ganhou.
        return jogo.turn() === corBot() ? -Infinity : Infinity;
    }

    let score = 0;
    const tabuleiro = jogo.board();
    const botColor = corBot();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const casa = tabuleiro[i][j];
            if (casa) {
                const valorMaterial = valoresPeca[casa.type];
                let valorPosicional = 0;
                
                if (casa.type === 'p') valorPosicional = (casa.color === 'w') ? pst_p[7 - i][j] : pst_p[i][j];
                if (casa.type === 'n') valorPosicional = (casa.color === 'w') ? pst_n[7 - i][j] : pst_n[i][j];

                const valorTotal = valorMaterial + valorPosicional;

                // Avalia em relação ao Bot
                if (casa.color === botColor) {
                    score += valorTotal;
                } else {
                    score -= valorTotal;
                }
            }
        }
    }
    return score;
}

// Algoritmo Minimax com Poda Alpha-Beta.

function minimax(jogo, profundidade, alpha, beta, maximizando) {
    if (profundidade === 0 || jogo.game_over()) {
        return avaliarPosicao(jogo);
    }

    const movimentos = jogo.moves();

    if (maximizando) { 
        let maxEval = -Infinity;
        for (const mov of movimentos) {
            jogo.move(mov);
            const avaliacao = minimax(jogo, profundidade - 1, alpha, beta, false);
            jogo.undo();
            
            maxEval = Math.max(maxEval, avaliacao);
            alpha = Math.max(alpha, avaliacao);
            
            if (beta <= alpha) break; 
        }
        return maxEval;
    } else { // Minimizando (vez do oponente do Bot)
        let minEval = Infinity;
        for (const mov of movimentos) {
            jogo.move(mov);
            const avaliacao = minimax(jogo, profundidade - 1, alpha, beta, true);
            jogo.undo();
            
            minEval = Math.min(minEval, avaliacao);
            beta = Math.min(beta, avaliacao);
            
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Lógica principal do bot: usa o Minimax para encontrar o melhor movimento.
function movimentoBotInteligente() {
    const movimentosValidos = jogo.moves();
    let melhorMovimento = null;
    let melhorAvaliacao = -Infinity;

    if (movimentosValidos.length === 0) return;

    for (const mov of movimentosValidos) {
        jogo.move(mov);
        
        // Chamada Minimax: buscando o melhor movimento para o bot (Max)
        const avaliacao = minimax(jogo, PROFUNDIDADE_BUSCA - 1, -Infinity, Infinity, false);
        
        jogo.undo(); 
        
        if (avaliacao > melhorAvaliacao) {
            melhorAvaliacao = avaliacao;
            melhorMovimento = mov;
        }
    }

    // Rede de Segurança: Se o Minimax falhar em retornar um movimento, use o primeiro legal.
    if (melhorMovimento === null && movimentosValidos.length > 0) {
        melhorMovimento = movimentosValidos[0]; 
    }

    if (melhorMovimento) {
        jogo.move(melhorMovimento);
        desenharTabuleiro();
    }

    if (jogo.game_over()) {
        atualizarStatus();
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    desenharTabuleiro();
});