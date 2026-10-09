// ==========================================
// 1. IMPORTAÇÃO DO FIREBASE (COM SETDOC E DOC INCLUSOS)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, orderBy, updateDoc, doc, addDoc, deleteDoc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLE AQUI A SUA CONFIGURAÇÃO DO FIREBASE (A mesma que você usa no client.js)
const firebaseConfig = {
  apiKey: "AIzaSyCjGW3aZm9EVPUze0d-uhcilL45OFhedRE",
  authDomain: "listateste-6ae7f.firebaseapp.com",
  projectId: "listateste-6ae7f",
  storageBucket: "listateste-6ae7f.firebasestorage.app",
  messagingSenderId: "902566685232",
  appId: "1:902566685232:web:fe0c03174d8740ff689bf5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. SISTEMA DE NOTIFICAÇÃO (TOASTS DE TELA)
// ==========================================
window.mostrarNotificacao = function(mensagem, tipo = 'info') {
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
// 3. NAVEGAÇÃO ENTRE ABAS DO PAINEL
// ==========================================
window.mostrarSecao = function(idSecao) {
    document.querySelectorAll('.tab-content').forEach(secao => {
        secao.style.display = 'none';
    });
    document.getElementById(idSecao).style.display = 'block';
}

// ==========================================
// 4. SISTEMA DE ALERTA INTERNO (SIMPLES E DIRETO)
// ==========================================
let alertasAtivados = false;

// O botão agora apenas libera o áudio do navegador (regra padrão de navegadores)
window.ativarNotificacoes = function() {
    alertasAtivados = true;
    
    const btn = document.getElementById('btnNotificacao');
    btn.innerHTML = "🔔 Alertas Ativados!";
    btn.style.background = "rgba(16, 185, 129, 0.2)";
    btn.style.color = "#10b981";
    btn.style.borderColor = "#10b981";
    
    tocarSomNotificacao();
    mostrarNotificacao("O painel vai apitar quando um novo cliente entrar!", "success");
}

function tocarSomNotificacao() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Bip
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.type = 'sine'; osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(1, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.1);

        // Bip agudo
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.type = 'sine'; osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.15);
        gain2.gain.setValueAtTime(1, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.start(ctx.currentTime + 0.15); osc2.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log("Áudio bloqueado."); }
}

// Quando alguém entra na fila, dispara isso:
function alertarNovoCliente(nomeCliente) {
    if (!alertasAtivados) return;

    // 1. Toca o Bip
    tocarSomNotificacao();

    // 2. Faz o celular vibrar
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // 3. Mostra o balão visual verde DENTRO DO SEU SITE (não falha nunca)
    mostrarNotificacao(`🚨 NOVO CLIENTE: ${nomeCliente} acabou de entrar na fila!`, "success");
}

// ==========================================
// 5. CONFIGURAÇÃO DE HORÁRIOS DE ATENDIMENTO
// ==========================================
const docHorarioRef = doc(db, "configuracoes", "horario_atendimento");

onSnapshot(docHorarioRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        const check24h = document.getElementById('check24h');
        const inputAbertura = document.getElementById('horaAbertura');
        const inputFechamento = document.getElementById('horaFechamento');

        if(check24h && inputAbertura && inputFechamento) {
            check24h.checked = data.is24h || false;
            inputAbertura.value = data.abertura || '';
            inputFechamento.value = data.fechamento || '';
            
            inputAbertura.disabled = data.is24h;
            inputFechamento.disabled = data.is24h;
        }
    }
});

const check24hElement = document.getElementById('check24h');
if(check24hElement){
    check24hElement.addEventListener('change', (e) => {
        document.getElementById('horaAbertura').disabled = e.target.checked;
        document.getElementById('horaFechamento').disabled = e.target.checked;
    });
}

window.salvarHorarios = async function() {
    const is24h = document.getElementById('check24h').checked;
    const abertura = document.getElementById('horaAbertura').value;
    const fechamento = document.getElementById('horaFechamento').value;

    if (!is24h && (!abertura || !fechamento)) {
        mostrarNotificacao("Preencha abertura e fechamento, ou marque 24h.", "error");
        return;
    }

    try {
        await setDoc(docHorarioRef, { is24h: is24h, abertura: abertura, fechamento: fechamento });
        mostrarNotificacao("Horários atualizados com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar horário:", error);
    }
}

// ==========================================
// 6. GERENCIAMENTO DA FILA E FINANCEIRO
// ==========================================
const dataFilaAdmin = document.getElementById('dataFilaAdmin');
const adminFilaList = document.getElementById('adminFilaList');

const hoje = new Date().toISOString().split('T')[0];
if(dataFilaAdmin) dataFilaAdmin.value = hoje;

let unsubscribeFila = null;

function carregarFilaAdmin(dataSelecionada) {
    if (unsubscribeFila) unsubscribeFila();

    const filaRef = collection(db, "fila");
    const filaQuery = query(filaRef, where("data", "==", dataSelecionada), orderBy("timestamp", "asc"));
    
    let primeiraCarga = true;

    unsubscribeFila = onSnapshot(filaQuery, (snapshot) => {
        
        // Dispara a notificação Push caso um novo documento tenha entrado no Firebase
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" && !primeiraCarga) {
                const novoCliente = change.doc.data();
                if (novoCliente.status === "aguardando") {
                    alertarNovoCliente(novoCliente.nome);
                }
            }
        });
        primeiraCarga = false; // A partir de agora, qualquer cliente novo apita

        // Renderiza a interface
        adminFilaList.innerHTML = '';
        let faturado = 0;
        let cortando = 0;
        let aguardando = 0;

        if (snapshot.empty) {
            adminFilaList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Nenhum cliente na fila para esta data.</p>';
        }

        snapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const id = docSnap.id;
            
            let totalCliente = 0;
            let servicosNomes = [];
            cliente.servicos.forEach(s => {
                totalCliente += s.valor;
                servicosNomes.push(s.nome);
            });

            // Só exibe quem está na Fila (Aguardando ou Cortando)
            if (cliente.status === 'aguardando' || cliente.status === 'cortando') {
                if (cliente.status === 'cortando') cortando++;
                if (cliente.status === 'aguardando') aguardando++;

                const isCortando = cliente.status === 'cortando';
                
                // Formata o Link do WhatsApp com DDI do Brasil (+55)
                const numeroLimpo = cliente.whatsapp ? cliente.whatsapp.replace(/\D/g, '') : '';
                const btnWhatsapp = cliente.whatsapp ? 
                    `<a href="https://wa.me/55${numeroLimpo}" target="_blank" style="display: block; text-align: center; background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 14px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-bottom: 12px; transition: all 0.3s ease; box-shadow: inset 0 1px 1px rgba(255,255,255,0.2);">
                        💬 Chamar no WhatsApp
                    </a>` : '';

                adminFilaList.innerHTML += `
                    <div class="cliente-card ${isCortando ? 'destaque' : ''}">
                        <h3>${cliente.nome}</h3>
                        <p style="margin: 5px 0; color: var(--text-muted); font-size: 0.95rem;">📱 ${cliente.whatsapp || 'Não informado'}</p>
                        <p style="margin-bottom: 8px;">💈 ${servicosNomes.join(', ')} <strong style="color: var(--cyan);">(R$ ${totalCliente.toFixed(2)})</strong></p>
                        <p>Status: <strong style="color: ${isCortando ? 'var(--cyan)' : 'var(--text-main)'}">${cliente.status.toUpperCase()}</strong></p>
                        
                        <div class="acoes">
                            ${btnWhatsapp}
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                ${!isCortando ? `<button onclick="alterarStatus('${id}', 'cortando')" style="background-color: var(--cyan); color: #000;">✂️ Iniciar</button>` : ''}
                                <button onclick="alterarStatus('${id}', 'concluido')" class="btn-success">✅ Concluir</button>
                                <button onclick="alterarStatus('${id}', 'ausente')" class="btn-danger">❌ Ausente</button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (cliente.status === 'concluido') {
                // Calcula o Dashboard Financeiro
                faturado += totalCliente;
            }
        });

        // Atualiza os Painéis Financeiros e de Metas
        document.getElementById('totalFaturadoDia').innerText = `R$ ${faturado.toFixed(2)}`;
        document.getElementById('qtdCortando').innerText = cortando;
        document.getElementById('qtdAguardando').innerText = aguardando;
    });
}

if(dataFilaAdmin) {
    carregarFilaAdmin(hoje);
    dataFilaAdmin.addEventListener('change', (e) => {
        carregarFilaAdmin(e.target.value);
    });
}

// Alterar Status do Cliente
window.alterarStatus = async function(id, novoStatus) {
    try {
        const clienteRef = doc(db, "fila", id);
        await updateDoc(clienteRef, { status: novoStatus });
        mostrarNotificacao(`Cliente marcado como ${novoStatus.toUpperCase()}`, "success");
    } catch (error) {
        mostrarNotificacao("Erro ao atualizar status.", "error");
    }
}

// ==========================================
// 7. GERENCIAMENTO DO HISTÓRICO
// ==========================================
const dataHistorico = document.getElementById('dataHistorico');
if(dataHistorico) {
    dataHistorico.value = hoje;
    dataHistorico.addEventListener('change', (e) => { carregarHistorico(e.target.value); });
    carregarHistorico(hoje);
}

function carregarHistorico(dataSelecionada) {
    const filaRef = collection(db, "fila");
    const filaQuery = query(filaRef, where("data", "==", dataSelecionada), orderBy("timestamp", "desc"));
    
    onSnapshot(filaQuery, (snapshot) => {
        const historicoList = document.getElementById('historicoList');
        historicoList.innerHTML = '';
        
        snapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            
            if (cliente.status === 'concluido' || cliente.status === 'ausente') {
                let totalCliente = 0;
                let servicosNomes = [];
                cliente.servicos.forEach(s => {
                    totalCliente += s.valor;
                    servicosNomes.push(s.nome);
                });

                historicoList.innerHTML += `
                    <div class="cliente-card" style="opacity: 0.8;">
                        <h3>${cliente.nome} <span style="font-size: 0.9rem; color: ${cliente.status === 'concluido' ? '#10b981' : '#ef4444'};">- ${cliente.status.toUpperCase()}</span></h3>
                        <p style="margin: 5px 0; color: var(--text-muted); font-size: 0.9rem;">📱 ${cliente.whatsapp || 'Não informado'}</p>
                        <p>💈 ${servicosNomes.join(', ')} (R$ ${totalCliente.toFixed(2)})</p>
                    </div>
                `;
            }
        });
        if(historicoList.innerHTML === '') {
            historicoList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhum histórico para esta data.</p>';
        }
    });
}

// ==========================================
// 8. GERENCIAR SERVIÇOS
// ==========================================
window.adicionarServico = async function() {
    const nome = document.getElementById('novoServicoNome').value;
    const valor = parseFloat(document.getElementById('novoServicoValor').value);

    if (!nome || isNaN(valor)) {
        mostrarNotificacao("Preencha o nome e o valor corretamente.", "error");
        return;
    }

    try {
        await addDoc(collection(db, "servicos"), { nome: nome, valor: valor });
        mostrarNotificacao("Serviço adicionado à barbearia!", "success");
        document.getElementById('novoServicoNome').value = '';
        document.getElementById('novoServicoValor').value = '';
    } catch (error) {
        mostrarNotificacao("Erro ao adicionar serviço.", "error");
    }
}

// Carregar Serviços em tempo real
const servicosRef = collection(db, "servicos");
onSnapshot(servicosRef, (snapshot) => {
    const servicosList = document.getElementById('servicosList');
    if(!servicosList) return;
    servicosList.innerHTML = '';
    
    snapshot.forEach((docSnap) => {
        const servico = docSnap.data();
        servicosList.innerHTML += `
            <div class="cliente-card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                <div>
                    <strong style="color: #fff; font-size: 1.1rem;">${servico.nome}</strong>
                    <p style="color: var(--cyan); margin-top: 5px;">R$ ${servico.valor.toFixed(2)}</p>
                </div>
                <button onclick="deletarServico('${docSnap.id}')" class="btn-danger" style="width: auto; padding: 10px 15px;">Excluir</button>
            </div>
        `;
    });
});

window.deletarServico = async function(id) {
    if(confirm("Tem certeza que deseja excluir este serviço? O botão sumirá do aplicativo do cliente.")) {
        await deleteDoc(doc(db, "servicos", id));
        mostrarNotificacao("Serviço excluído com sucesso.", "success");
    }
}

// ==========================================
// 9. BLOQUEAR DATAS / FERIADOS
// ==========================================
window.bloquearData = async function() {
    const data = document.getElementById('novaDataBloqueada').value;
    if (!data) {
        mostrarNotificacao("Selecione uma data no calendário para bloquear.", "info");
        return;
    }

    const datasRef = collection(db, "datas_indisponiveis");
    const q = query(datasRef, where("data", "==", data));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        mostrarNotificacao("Esta data já consta como bloqueada!", "error");
        return;
    }

    try {
        await addDoc(datasRef, { data: data });
        mostrarNotificacao("Data bloqueada. Clientes não poderão agendar neste dia.", "success");
        document.getElementById('novaDataBloqueada').value = '';
    } catch (error) {
        mostrarNotificacao("Erro ao bloquear data.", "error");
    }
}

// Carrega as Datas Bloqueadas
const datasBlockRef = collection(db, "datas_indisponiveis");
onSnapshot(datasBlockRef, (snapshot) => {
    const list = document.getElementById('datasBloqueadasList');
    if(!list) return;
    list.innerHTML = '';
    
    snapshot.forEach((docSnap) => {
        const d = docSnap.data().data;
        const dataFormatada = d.split('-').reverse().join('/');
        list.innerHTML += `
            <div class="cliente-card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                <strong style="color: #fff; font-size: 1.1rem;">📅 ${dataFormatada}</strong>
                <button onclick="desbloquearData('${docSnap.id}')" class="btn-success" style="width: auto; padding: 10px 15px;">Liberar Dia</button>
            </div>
        `;
    });
});

window.desbloquearData = async function(id) {
    await deleteDoc(doc(db, "datas_indisponiveis", id));
    mostrarNotificacao("Data liberada para agendamentos.", "success");
}
