import StoryApiService from '../data/api';
import AuthService from '../data/auth';
import { initCamera, stopCamera } from '../utils/camera-utils';
import { initMap } from '../utils/map-utils';

export default class AddStoryPage {
  constructor() {
    this.photoFile = null;
    this.location = { lat: null, lon: null };
    this.cameraStream = null;
    this.isCameraActive = false;
    this.map = null;
    this.marker = null;
  }

  render() {
    return `
      <section class="add-story-container" aria-labelledby="add-story-title">
        <h1 id="add-story-title">Tambah Story Baru</h1>
        
        <form id="storyForm" aria-label="Form tambah story baru">
          <fieldset>
            <legend class="sr-only">Detail Story</legend>
            
            <div class="form-group" role="group" aria-labelledby="desc-label">
              <label id="desc-label" for="description">Deskripsi</label>
              <textarea 
                id="description" 
                aria-describedby="desc-help"
                placeholder="Ceritakan pengalamanmu..."
                required
              ></textarea>
              <p id="desc-help" class="help-text">Minimal 10 karakter</p>
            </div>

            <div class="form-group" role="group" aria-labelledby="photo-source-label">
              <p id="photo-source-label">Pilih sumber foto:</p>
              
              <div class="upload-options">
                <div class="upload-option">
                  <input 
                    type="radio" 
                    id="cameraSource" 
                    name="photoSource" 
                    value="camera" 
                    checked
                    aria-controls="cameraSection gallerySection"
                  >
                  <label for="cameraSource">Ambil Foto</label>
                </div>
                <div class="upload-option">
                  <input 
                    type="radio" 
                    id="gallerySource" 
                    name="photoSource" 
                    value="gallery"
                    aria-controls="cameraSection gallerySection"
                  >
                  <label for="gallerySource">Upload dari Galeri</label>
                </div>
              </div>
            </div>

            <div id="cameraSection" class="upload-section">
              <div class="form-group">
                <label for="cameraView" id="camera-label">Pratinjau Kamera</label>
                <video 
                  id="cameraView" 
                  width="320" 
                  height="240" 
                  autoplay
                  aria-labelledby="camera-label"
                  aria-describedby="camera-help"
                ></video>
                <p id="camera-help" class="help-text">Izinkan akses kamera saat diminta</p>
                <button 
                  type="button" 
                  id="captureBtn"
                  aria-label="Ambil foto dari kamera"
                >
                  Ambil Foto
                </button>
                <button 
                  type="button" 
                  id="closeCameraBtn"
                  aria-label="Tutup Kamera"
                >
                  Tutup Kamera
                </button>
              </div>
              <canvas id="photoCanvas" style="display:none;"></canvas>
            </div>

            <div id="gallerySection" class="upload-section" style="display:none;">
              <div class="form-group">
                <label for="fileInput" id="file-label">Pilih dari galeri</label>
                <input 
                  type="file" 
                  id="fileInput" 
                  accept="image/*"
                  aria-labelledby="file-label"
                  aria-describedby="file-help"
                >
                <p id="file-help" class="help-text">Format: JPG, PNG (maks. 5MB)</p>
              </div>
              <img 
                id="filePreview" 
                style="max-width:320px; display:none;"
                alt="Pratinjau gambar yang dipilih"
              >
            </div>

            <div class="photo-preview">
              <p id="preview-label">Pratinjau:</p>
              <img 
                id="photoPreview" 
                style="max-width:320px; display:none;"
                aria-labelledby="preview-label"
                alt="Pratinjau foto yang akan diupload"
              >
            </div>
          </fieldset>
          
          <div class="form-group" role="group" aria-labelledby="map-label">
            <p id="map-label">Lokasi:</p>
            <div 
              id="map" 
              style="height:300px;"
              role="application"
              aria-label="Peta pemilihan lokasi"
              tabindex="0"
            ></div>
            <p class="help-text">Klik peta untuk memilih lokasi</p>
          </div>
          
          <button 
            type="submit" 
            class="submit-btn"
            aria-live="polite"
          >
            Publikasikan
          </button>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this._initMap();
    this._setupEventListeners();
  }

  _initMap() {
    this.map = initMap('map');
    this.map.on('click', (e) => {
      this._handleMapClick(e);
    });
  }

  _handleMapClick(e) {
    this.location = { lat: e.latlng.lat, lon: e.latlng.lng };
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker([this.location.lat, this.location.lon])
      .addTo(this.map)
      .bindPopup(`Lokasi dipilih: ${this.location.lat.toFixed(4)}, ${this.location.lon.toFixed(4)}`)
      .openPopup();
  }

  _setupEventListeners() {
    document.querySelectorAll('input[name="photoSource"]').forEach(radio => {
      radio.addEventListener('change', (e) => this._handleSourceChange(e));
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        this._handleFileUpload(file);
      }
    });

    document.getElementById('captureBtn').addEventListener('click', async () => {
      await this._handleCapture();
    });

    document.getElementById('storyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleSubmit();
    });

    document.getElementById('closeCameraBtn').addEventListener('click', () => {
      this._closeCamera();
    });
  }

  async _handleSourceChange(e) {
    const cameraSection = document.getElementById('cameraSection');
    const gallerySection = document.getElementById('gallerySection');
    
    if (e.target.value === 'camera') {
      cameraSection.style.display = 'block';
      gallerySection.style.display = 'none';
      await this._initCamera();
    } else {
      cameraSection.style.display = 'none';
      gallerySection.style.display = 'block';
      this._closeCamera();
    }
  }

  async _initCamera() {
    if (this.isCameraActive) return;
    
    try {
      const videoElement = document.getElementById('cameraView');
      this.cameraStream = await initCamera(videoElement);
      this.isCameraActive = true;
      videoElement.setAttribute('aria-busy', 'false');
    } catch (error) {
      console.error("Failed to access camera:", error);
      this._switchToGallery();
      this._showToast("Kamera tidak tersedia. Silakan upload dari galeri.");
    }
  }

  _closeCamera() {
    if (this.cameraStream) {
      stopCamera(this.cameraStream);
      this.cameraStream = null;
      document.getElementById('cameraView').srcObject = null;
      this.isCameraActive = false;
    }
  }

  _switchToGallery() {
    document.getElementById('gallerySource').checked = true;
    document.getElementById('cameraSection').style.display = 'none';
    document.getElementById('gallerySection').style.display = 'block';
  }

  async _handleCapture() {
    if (!this.isCameraActive) {
      await this._initCamera();
      return;
    }

    const video = document.getElementById('cameraView');
    const canvas = document.getElementById('photoCanvas');
    const preview = document.getElementById('photoPreview');
    
    video.setAttribute('aria-busy', 'true');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        this.photoFile = new File([blob], 'story-photo.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        preview.src = canvas.toDataURL('image/jpeg');
        preview.style.display = 'block';
        preview.setAttribute('alt', 'Pratinjau foto dari kamera');
        
        this._closeCamera();
        video.setAttribute('aria-busy', 'false');
        resolve(this.photoFile);
      }, 'image/jpeg', 0.8);
    });
  }

  _handleFileUpload(file) {
    this.photoFile = file;
    const preview = document.getElementById('photoPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    preview.setAttribute('alt', `Pratinjau ${file.name}`);
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  async _handleSubmit() {
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Mengupload...';
    
    if (!this.photoFile) {
      this._showToast('Harap tambahkan foto terlebih dahulu!');
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Publikasikan';
      return;
    }

    const description = document.getElementById('description').value;
    
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Anda perlu login untuk menambahkan story');
      }

      await StoryApiService.addStory(token, {
        description,
        photo: this.photoFile,
        lat: this.location.lat,
        lon: this.location.lon
      });
      
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Story berhasil dibuat', {
          body: `Anda telah membuat story baru dengan deskripsi: ${description.substring(0, 50)}...`,
          icon: '/public/images/icon-192x192.png'
        });
      }
      
      submitBtn.textContent = 'Berhasil!';
      setTimeout(() => {
        window.location.hash = '#/';
      }, 1500);
    } catch (error) {
      this._showToast(`Gagal: ${error.message}`);
    } finally {
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Publikasikan';
      this._closeCamera();
    }
  }
}