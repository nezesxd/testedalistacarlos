// ==========================================
// 1. IMPORTAÇÃO DO FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLE AQUI A SUA CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCjGW3aZm9EVPUze0d-uhcilL45OFhedRE",
  authDomain: "listateste-6ae7f.firebaseapp.com",
  projectId: "listateste-6ae7f",
  storageBucket: "listateste-6ae7f.firebasestorage.app",
  messagingSenderId: "902566685232",
  appId: "1:902566685232:web:fe0c03174d8740ff689bf5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. TELA DE BEM-VINDO (SPLASH SCREEN)
// ==========================================
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
            setTimeout(() => { splashScreen.remove(); }, 800);
        }, 2000); // Exibe por 2 segundos
    }
});

// ==========================================
// 3. SISTEMA DE NOTIFICAÇÃO (TOASTS)
// ==========================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 4000);
}

// ==========================================
// 4. MÁSCARA AUTOMÁTICA DE WHATSAPP
// ==========================================
const inputWhatsapp = document.getElementById('whatsappCliente');
if (inputWhatsapp) {
    inputWhatsapp.addEventListener('input', function (e) {
        let valor = e.target.value.replace(/\D/g, ''); 
        let formatado = valor;
        
        if (valor.length > 2) {
            formatado = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
        }
        if (valor.length > 7) {
            formatado = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7, 11)}`;
        }
        e.target.value = formatado;
    });
}

// ==========================================
// 5. DATA INICIAL E HORÁRIO DE ATENDIMENTO
// ==========================================
const dataInput = document.getElementById('dataEscolhida');
const hoje = new Date().toISOString().split('T')[0];
dataInput.value = hoje;

let configuracaoHorario = { is24h: true, abertura: '00:00', fechamento: '23:59' };
const docHorarioRef = doc(db, "configuracoes", "horario_atendimento");
const horarioTexto = document.getElementById('horarioFuncionamento');

onSnapshot(docHorarioRef, (docSnap) => {
    if (docSnap.exists()) {
        configuracaoHorario = docSnap.data();
        if (configuracaoHorario.is24h) {
            horarioTexto.innerHTML = "🕒 <strong>Atendimento 24 Horas</strong>";
        } else {
            horarioTexto.innerHTML = `🕒 Lista aberta das <strong>${configuracaoHorario.abertura} às ${configuracaoHorario.fechamento}</strong>`;
        }
    } else {
        horarioTexto.innerHTML = "🕒 Horários ainda não definidos pelo barbeiro.";
    }
});

// ==========================================
// 6. CARREGAR SERVIÇOS DISPONÍVEIS
// ==========================================
const servicosRef = collection(db, "servicos");
onSnapshot(servicosRef, (snapshot) => {
    const listaServicos = document.getElementById('listaServicos');
    listaServicos.innerHTML = '';
    
    snapshot.forEach((docSnap) => {
        const servico = docSnap.data();
        listaServicos.innerHTML += `
            <label>
                <div>
                    <input type="checkbox" name="servicos" value="${servico.nome}" data-valor="${servico.valor}">
                    <span style="margin-left: 10px; color: #fff;">${servico.nome}</span>
                </div>
                <span style="color: var(--cyan); font-weight: bold;">R$ ${servico.valor.toFixed(2)}</span>
            </label>
        `;
    });
});

// ==========================================
// 7. CARREGAR FILA EM TEMPO REAL
// ==========================================
function carregarFila(data) {
    const filaRef = collection(db, "fila");
    const q = query(filaRef, where("data", "==", data), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const filaClienteList = document.getElementById('filaClienteList');
        filaClienteList.innerHTML = '';
        
        let temGenteNaFila = false;

        snapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            
            if (cliente.status === 'aguardando' || cliente.status === 'cortando') {
                temGenteNaFila = true;
                
                const isCortando = cliente.status === 'cortando';
                const statusTexto = isCortando ? '✂️ NA CADEIRA' : '⏳ AGUARDANDO';
                const corStatus = isCortando ? 'var(--cyan)' : 'var(--text-muted)';
                const opacidade = isCortando ? '1' : '0.7';

                filaClienteList.innerHTML += `
                    <li style="border-left: 4px solid ${corStatus}; opacity: ${opacidade};">
                        <strong style="color: #fff; font-size: 1.1rem;">${cliente.nome}</strong>
                        <span style="color: ${corStatus}; font-weight: bold; font-size: 0.9rem;">${statusTexto}</span>
                    </li>
                `;
            }
        });

        if (!temGenteNaFila) {
            filaClienteList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">A fila está vazia no momento. Seja o primeiro!</p>';
        }
    });
}

carregarFila(hoje);
dataInput.addEventListener('change', (e) => { carregarFila(e.target.value); });

// ==========================================
// 8. CADASTRAR CLIENTE (Com Validações)
// ==========================================
const form = document.getElementById('filaForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // A. VALIDAÇÃO DO HORÁRIO DE FUNCIONAMENTO
    if (!configuracaoHorario.is24h && configuracaoHorario.abertura && configuracaoHorario.fechamento) {
        const agora = new Date();
        const tempoAtualEmMinutos = (agora.getHours() * 60) + agora.getMinutes();

        const [aberturaHora, aberturaMin] = configuracaoHorario.abertura.split(':').map(Number);
        const tempoAbertura = (aberturaHora * 60) + aberturaMin;

        const [fechamentoHora, fechamentoMin] = configuracaoHorario.fechamento.split(':').map(Number);
        const tempoFechamento = (fechamentoHora * 60) + fechamentoMin;

        let estaAberto = false;
        if (tempoFechamento >= tempoAbertura) {
            estaAberto = tempoAtualEmMinutos >= tempoAbertura && tempoAtualEmMinutos <= tempoFechamento;
        } else {
            estaAberto = tempoAtualEmMinutos >= tempoAbertura || tempoAtualEmMinutos <= tempoFechamento;
        }

        if (!estaAberto) {
            mostrarNotificacao(`Estamos fechados! O horário de atendimento é das ${configuracaoHorario.abertura} às ${configuracaoHorario.fechamento}.`, "error");
            return; 
        }
    }

    const data = dataInput.value;
    
    // B. VALIDAÇÃO DE DATA BLOQUEADA
    const datasRef = collection(db, "datas_indisponiveis");
    const bloqueioQuery = query(datasRef, where("data", "==", data));
    const datasSnap = await getDocs(bloqueioQuery);

    if (!datasSnap.empty) {
        mostrarNotificacao("Agenda encerrada ou indisponível para esta data.", "error");
        return; 
    }

    // C. PEGAR OS DADOS E SALVAR NO FIREBASE
    const nome = document.getElementById('nomeCliente').value;
    const whatsapp = document.getElementById('whatsappCliente').value;
    
    const servicosSelecionados = [];
    document.querySelectorAll('input[name="servicos"]:checked').forEach((checkbox) => {
        servicosSelecionados.push({
            nome: checkbox.value,
            valor: parseFloat(checkbox.dataset.valor)
        });
    });

    if (servicosSelecionados.length === 0) {
        mostrarNotificacao("Por favor, selecione pelo menos um serviço.", "info");
        return;
    }

    try {
        await addDoc(collection(db, "fila"), {
            nome: nome,
            whatsapp: whatsapp, // Salvando o WhatsApp formatado
            data: data,
            servicos: servicosSelecionados,
            status: "aguardando",
            timestamp: serverTimestamp()
        });

        mostrarNotificacao("Você entrou na fila com sucesso!", "success");
        form.reset();
        dataInput.value = data; // Mantém a data que ele tinha escolhido após resetar
        
    } catch (error) {
        console.error("Erro ao entrar na fila:", error);
        mostrarNotificacao("Erro ao processar. Tente novamente.", "error");
    }
});