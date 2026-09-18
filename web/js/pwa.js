/**
 * PWA Manager - SAP BTP Portal de Logística & Estoque RF
 * Gerencia o registro do Service Worker e o prompt de instalação (A2HS)
 */

class PwaManager {
  constructor() {
    this.deferredPrompt = null;
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupNetworkStatusListener();
  }

  // 1. Registro do Service Worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registrado com sucesso. Escopo:', registration.scope);
          })
          .catch((error) => {
            console.warn('[PWA] Falha ao registrar Service Worker:', error);
          });
      });
    }
  }

  // 2. Captura o evento nativo de instalação
  setupInstallPrompt() {
    const installBtn = document.getElementById('btnInstallPwa');
    if (!installBtn) return;

    // Se já estiver rodando instalado como App, oculta o botão
    if (this.isStandalone) {
      installBtn.style.display = 'none';
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Previne o infobar padrão do navegador
      e.preventDefault();
      this.deferredPrompt = e;
      // Mostra o botão de instalação com animação sutil
      installBtn.style.display = 'inline-flex';
      installBtn.classList.add('pulse-install');
      console.log('[PWA] Pronto para instalação na tela inicial.');
    });

    installBtn.addEventListener('click', async () => {
      if (!this.deferredPrompt) {
        // Fallback explicativo caso o navegador não suporte o prompt automático
        alert('Para instalar este portal no seu dispositivo:\n\n1. No Chrome: Abra o menu do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".\n2. No Safari (iOS): Toque em "Compartilhar" e escolha "Adicionar à Tela de Início".');
        return;
      }

      // Dispara o prompt nativo do Android / Chrome / Windows
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`[PWA] Escolha do operador: ${outcome}`);

      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      this.deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplicativo instalado com sucesso no dispositivo.');
      installBtn.style.display = 'none';
      if (window.showToast) {
        window.showToast('Aplicativo instalado na tela inicial com sucesso!', 'success');
      }
    });
  }

  // 3. Monitoramento de status de rede (Online / Offline)
  setupNetworkStatusListener() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      const statusPill = document.getElementById('headerStatusPill');
      const statusText = document.getElementById('headerStatusText');

      if (!isOnline) {
        if (statusPill) statusPill.className = 'status-pill mode-offline';
        if (statusText) statusText.textContent = 'Sem Conexão (Modo Offline)';
        if (window.showToast) {
          window.showToast('Sem conexão de rede. Operando em modo offline seguro.', 'warning');
        }
      } else {
        if (window.sapStore && window.sapStore.isBtpConnected) {
          if (statusPill) statusPill.className = 'status-pill mode-btp';
          if (statusText) statusText.textContent = 'SAP BTP OData V4 Conectado';
        } else {
          if (statusPill) statusPill.className = 'status-pill';
          if (statusText) statusText.textContent = 'Modo Demo / Offline';
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
}

// Inicializa o PWA Manager globalmente
window.pwaManager = new PwaManager();
