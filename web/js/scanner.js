// =========================================================================
// MÓDULO DE LEITURA DE CÓDIGO DE BARRAS & BIPAGEM
// Suporta: Leitor Laser USB/Bluetooth, Câmera em Tempo Real (BarcodeDetector API) e Amostras
// =========================================================================

class BarcodeScannerService {
  constructor() {
    this.buffer = '';
    this.lastKeyTime = Date.now();
    this.scannerThresholdMs = 50; // Leitores de hardware digitam em menos de 30-50ms por char
    this.onScanCallbacks = [];
    this.videoStream = null;
    this.scanInterval = null;
    this.isScanning = false;
    this.barcodeDetector = null;

    this.initBarcodeDetector();
    this.initHardwareListener();
  }

  async initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        this.barcodeDetector = new BarcodeDetector({
          formats: supported.length > 0 ? supported : ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a']
        });
        console.log('✅ BarcodeDetector nativo suportado com formatos:', supported);
      } catch (err) {
        console.warn('BarcodeDetector não suportado ou erro ao inicializar:', err);
      }
    } else {
      console.info('ℹ️ BarcodeDetector API não disponível nativamente neste navegador.');
    }
  }

  onScan(callback) {
    this.onScanCallbacks.push(callback);
  }

  triggerScan(barcodeValue, type = 'MATERIAL') {
    if (!barcodeValue) return;
    window.industrialBeeper.beepSuccess();
    this.showScanFlash();
    this.onScanCallbacks.forEach(cb => cb(barcodeValue.trim(), type));
  }

  showScanFlash() {
    const flashEl = document.getElementById('scannerFlash');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 250);
    }
  }

  initHardwareListener() {
    window.addEventListener('keydown', (e) => {
      // Ignorar se o foco for em inputs exceto se for sequência super rápida (leitor laser)
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastKeyTime;
      this.lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (this.buffer.length >= 3 && timeDiff < 100) {
          e.preventDefault();
          this.triggerScan(this.buffer, 'HARDWARE_SCAN');
          this.buffer = '';
        } else {
          this.buffer = '';
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 120) {
          this.buffer = '';
        }
        this.buffer += e.key;
      }
    });
  }

  // =========================================================================
  // LEITOR DE CÂMERA REAL (WEBCAM / SMARTPHONE)
  // =========================================================================
  async startCamera(videoElementId, statusElementId) {
    const video = document.getElementById(videoElementId);
    const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
    if (!video) return false;

    try {
      if (statusEl) statusEl.textContent = 'Solicitando acesso à câmera...';

      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Câmera traseira em celulares
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      video.srcObject = this.videoStream;
      await video.play();

      this.isScanning = true;
      if (statusEl) statusEl.textContent = 'Aponte a câmera para o código de barras ou QR Code';

      // Inicia loop de detecção contínua
      this.startDetectionLoop(video, statusEl);
      return true;
    } catch (err) {
      console.warn('Erro ao acessar câmera:', err);
      if (statusEl) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          statusEl.textContent = 'Permissão de câmera negada pelo usuário.';
        } else if (err.name === 'NotFoundError') {
          statusEl.textContent = 'Nenhuma câmera detectada no dispositivo.';
        } else {
          statusEl.textContent = 'Câmera não disponível: ' + (err.message || 'Erro desconhecido');
        }
      }
      return false;
    }
  }

  startDetectionLoop(video, statusEl) {
    if (this.scanInterval) clearInterval(this.scanInterval);

    this.scanInterval = setInterval(async () => {
      if (!this.isScanning || !video || video.readyState < 2) return;

      if (this.barcodeDetector) {
        try {
          const barcodes = await this.barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code) {
              if (statusEl) statusEl.textContent = `Código detectado: ${code}!`;
              this.stopCamera(video.id);
              this.triggerScan(code, 'CAMERA_SCAN');
              
              // Fechar modal de câmera se existir
              const modal = document.getElementById('cameraScannerModal');
              if (modal) modal.style.display = 'none';
            }
          }
        } catch (err) {
          // Frame drop ou processamento transitório ignorado
        }
      }
    }, 180); // Verifica a cada 180ms
  }

  stopCamera(videoElementId) {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    const video = document.getElementById(videoElementId);
    if (video) {
      video.srcObject = null;
    }
  }
}

window.barcodeScanner = new BarcodeScannerService();
