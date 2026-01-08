// --- GLOBAL VARIABLES ---
let jogo = new Chess(); 
let tabuleiroDiv = document.getElementById('tabuleiro');
let casaSelecionada = null;
let botAtivo = true;
// Defines who is at the bottom of the board ('w' for White at the bottom, 'b' for Black at the bottom).
let orientacaoTabuleiro = 'w'; 

// Mapping of parts (using Unicode symbols)
const pecasUnicode = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
};

// Deep AI search
const PROFUNDIDADE_BUSCA = 2; 

// --- INTERFACE AND RENDERING FUNCTIONS (WITH INVERSION) ---

function desenharTabuleiro() {
    tabuleiroDiv.innerHTML = ''; // Clear coordinates

    // Configures the iteration order to render according to the orientation.
    const ranks = (orientacaoTabuleiro === 'w') ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = (orientacaoTabuleiro === 'w') ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    
    // 1. Create the inner container that will hold the 64 houses.
    const gridCasas = document.createElement('div');
    gridCasas.className = 'tabuleiro-grid';

    const casas = jogo.board();
    
    // 2. Create and add the 64 interior houses to the gridCasas
    for (const rank of ranks) { 
        // i is the array index from chess.js (0 to 7, where 0 is line 8)
        const i = 8 - rank; 
        
        for (const j of files) { // j is the column index (0 to 7)
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
    
    // 3. Add the housing container (gridCasas) to the main board.
    tabuleiroDiv.appendChild(gridCasas); 


    // 4. Generate and add the coordinates (also reversed)
    
    // Ranks for Coordinates (8-1 or 1-8)
    const ranksCoord = (orientacaoTabuleiro === 'w') ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    for (let idx = 0; idx < 8; idx++) {
        const rank = ranksCoord[idx]; 
        const gridRowPos = idx + 2; // Lines 2 to 9 (for the houses)

        // Left Coordinate
        const coordEsq = document.createElement('div');
        coordEsq.className = 'coordenada lateral';
        coordEsq.style.gridRow = gridRowPos; 
        coordEsq.textContent = rank;
        tabuleiroDiv.appendChild(coordEsq);
        
        // Right Coordinate
        const coordDir = document.createElement('div');
        coordDir.className = 'coordenada';
        coordDir.style.gridRow = gridRowPos; 
        coordDir.style.gridColumn = 10;
        coordDir.textContent = rank;
        tabuleiroDiv.appendChild(coordDir);
    }

    // Files for Coordinates (a-h or h-a)
    const filesCoord = (orientacaoTabuleiro === 'w') ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    for (let idx = 0; idx < 8; idx++) {
        const j = filesCoord[idx];
        const file = String.fromCharCode(97 + j); 
        const gridColPos = idx + 2; // Columns 2 to 9 (for the houses)

        // Lower Coordinate
        const coordInf = document.createElement('div');
        coordInf.className = 'coordenada inferior';
        coordInf.style.gridColumn = gridColPos; 
        coordInf.textContent = file;
        tabuleiroDiv.appendChild(coordInf);
        
        // Higher Coordinate
        const coordSup = document.createElement('div');
        coordSup.className = 'coordenada superior';
        coordSup.style.gridColumn = gridColPos; 
        coordSup.textContent = file;
        tabuleiroDiv.appendChild(coordSup);
    }
    
    // 5. Update history and status
    atualizarStatus();
    atualizarHistorico();
}

function onCasaClick(nomeCasa) {
    limparMarcacoes();
    const divCasa = document.getElementById(nomeCasa);

    if (casaSelecionada === null) {
        const peca = jogo.get(nomeCasa);
        // Selection is only allowed if the piece is the same color as the game being played.
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
            
            // Check if it's the Bot's turn and if it's active.
            if (botAtivo && jogo.turn() !== jogadorLocal()) {
                setTimeout(movimentoBotInteligente, 500); 
            }
        } else {
            casaSelecionada = null; 
            onCasaClick(nomeCasa); 
        }
    }
}

// Utility functions to determine who is the human player and who is the bot
function jogadorLocal() {
    // The human player always plays with the color at the bottom of the board
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

        // We use 'san' for Standard Algebraic Notation (e4, Nf3, etc.)
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
    const corVez = jogo.turn() === 'w' ? 'Whites' : 'Blacks';
    const nomeVez = jogo.turn() === jogadorLocal() ? 'You' : 'Bot';

    if (jogo.in_checkmate()) {
        status = `CHECKMATE! ${jogo.turn() === 'w' ? 'Blacks' : 'Whites'} WON.`;
    } else if (
        jogo.in_stalemate() ||
        jogo.in_threefold_repetition() ||
        jogo.insufficient_material() ||
        jogo.in_draw()
    ) {
        status = 'GAME OVER: DRAW.';
    } else {
        status = `Turn of ${corVez} (${nomeVez}).`;
        if (jogo.in_check()) {
            status += ' The King is in CHECK!';
        }
    }

    document.getElementById('status').innerText = status;
}

function novoJogo() {
    jogo.reset();
    casaSelecionada = null;
    desenharTabuleiro();
    
    const corVez = jogo.turn() === 'w' ? 'Whites' : 'Blacks';
    const nomeVez = jogo.turn() === jogadorLocal() ? 'You' : 'Bot';
    document.getElementById('status').innerText = `New game started. Turn of ${corVez} (${nomeVez}).`;
    
    // If the Bot is White and it's its turn, it makes the first move
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500); 
    }
}

function toggleBot() {
    botAtivo = !botAtivo;
    const btn = document.getElementById('toggle-bot');
    btn.innerText = `Bot ON/OFF (Current: ${botAtivo ? 'ON' : 'OFF'})`;
    
    // If activated and it's the Bot's turn
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500); 
    }
}

// Inverts the board orientation and updates the button
function inverterTabuleiro() {
    orientacaoTabuleiro = (orientacaoTabuleiro === 'w') ? 'b' : 'w';
    
    const btn = document.getElementById('toggle-orientacao');
    btn.innerText = `Orientation (Current: ${orientacaoTabuleiro === 'w' ? 'Whites' : 'Blacks'})`;
    
    desenharTabuleiro();
    
    // If it's the Bot's turn after changing orientation, the Bot plays
    if (botAtivo && jogo.turn() === corBot()) {
        setTimeout(movimentoBotInteligente, 500);
    } else {
        atualizarStatus(); // Updates to show the correct player/bot color
    }
}

// --- INTELLIGENT BOT LOGIC (AI) ---

// Positional Weight Tables (PSTs)
// ... (PSTs kept) ...
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

// Evaluates the board position. Positive: good for the Bot.
function avaliarPosicao(jogo) {
    if (jogo.game_over()) {
        // If the game is over and it's the Bot's turn, it lost (or drew).
        // If it's not the Bot's turn, it won.
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
                
                if (casa.type === 'p')
                    valorPosicional = (casa.color === 'w') ? pst_p[7 - i][j] : pst_p[i][j];
                if (casa.type === 'n')
                    valorPosicional = (casa.color === 'w') ? pst_n[7 - i][j] : pst_n[i][j];

                const valorTotal = valorMaterial + valorPosicional;

                // Evaluate relative to the Bot
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

// Minimax algorithm with Alpha-Beta pruning
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
    } else { // Minimizing (Bot opponent's turn)
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

// Main bot logic: uses Minimax to find the best move
function movimentoBotInteligente() {
    const movimentosValidos = jogo.moves();
    let melhorMovimento = null;
    let melhorAvaliacao = -Infinity;

    if (movimentosValidos.length === 0) return;

    for (const mov of movimentosValidos) {
        jogo.move(mov);
        
        // Minimax call: searching for the best move for the bot (Max)
        const avaliacao = minimax(
            jogo,
            PROFUNDIDADE_BUSCA - 1,
            -Infinity,
            Infinity,
            false
        );
        
        jogo.undo(); 
        
        if (avaliacao > melhorAvaliacao) {
            melhorAvaliacao = avaliacao;
            melhorMovimento = mov;
        }
    }

    // Safety net: if Minimax fails to return a move, use the first legal one
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

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    desenharTabuleiro();
});