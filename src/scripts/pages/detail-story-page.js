import StoryApiService from '../data/api';
import AuthService from '../data/auth';
import NotificationUtils from '../utils/notification-utils';
import { showFormattedDate } from '../utils';
import Swal from 'sweetalert2';
import StoryDB from '../database';

export default class DetailStoryPage {
  constructor() {
    this.storyId = null;
    this.storyData = null;
    this.isOfflineStory = false;
  }

  async render() {
    return `
      <section class="detail-story-container">
        <div class="detail-story-header">
          <a href="#/" class="back-button" aria-label="Kembali ke beranda">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <h1 class="detail-title">Detail Cerita</h1>
        </div>
        
        <div id="storyDetail" class="story-content">
          <div class="skeleton-loading">
            <div class="skeleton-image"></div>
            <div class="skeleton-line w-75"></div>
            <div class="skeleton-line w-100"></div>
            <div class="skeleton-line w-50"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStory();
    this.setupEventListeners();
  }

  async loadStory() {
    try {
      let urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      this.storyId = urlParams.get('id');
      
      if (!this.storyId) {
        const pathParts = window.location.hash.replace('#/', '').split('/');
        if (pathParts.length > 1 && pathParts[0] === 'detail') {
          this.storyId = pathParts[1];
        }
      }
      
      if (!this.storyId) {
        throw new Error('ID Cerita tidak valid atau tidak ditemukan');
      }

      const offlineStory = await StoryDB.getStory(this.storyId);
      if (offlineStory) {
        this.isOfflineStory = true;
        this.storyData = { story: offlineStory };
        this.renderStoryDetail(offlineStory);
        return;
      }

      const token = AuthService.getToken();
      if (!token) {
        this.showError('Anda perlu login untuk melihat detail cerita');
        const errorEl = document.querySelector('.error-message');
        if (errorEl) {
          errorEl.innerHTML += `
            <a href="#/login" class="retry-button">Login</a>
          `;
        }
        return;
      }

      const response = await StoryApiService.getStoryDetail(token, this.storyId);
      
      if (response && !response.error && response.story) {
        this.storyData = response;
        this.renderStoryDetail(response.story);
        try {
          await this._updateSubscribeButton();
        } catch (subscribeError) {
          console.warn('Could not update subscription status:', subscribeError);
        }
      } else {
        throw new Error(response?.message || 'Gagal memuat detail cerita');
      }
    } catch (error) {
      console.error('Error loading story:', error);
      this.showError(error.message || 'Gagal memuat detail cerita');
    }
  }

renderStoryDetail(story) {
  const storyDetailEl = document.getElementById('storyDetail');
  const formattedDescription = story.description.replace(/\n/g, '<br>');
  const isSaved = this.isOfflineStory || false;
  
  storyDetailEl.innerHTML = `
    <article class="story-article">
      <!-- Author and Subscribe Button -->
      <div class="author-header">
        <div class="author-info">
          <img src="${story.authorAvatar || './public/images/default-avatar.png'}" 
               alt="${story.name}" 
               class="author-avatar">
          <h2 class="author-name">${story.name}</h2>
        </div>
        ${!this.isOfflineStory ? `
          <button class="subscribe-button" id="subscribeButton" data-subscribed="${story.isSubscribed || 'false'}">
            ${story.isSubscribed ? 'Berhenti Mengikuti' : 'Ikuti'}
          </button>
        ` : ''}
      </div>
      
      <!-- Story Image -->
      <figure class="story-image-container">
        <img src="${story.photoUrl}" 
             alt="${story.description}" 
             class="story-image" 
             loading="lazy">
      ${story.lat && story.lon ? `
        <button class="location-button" id="showLocation" aria-label="Lihat lokasi">
          <svg class="location-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                  fill="#4285F4"/>
            <path d="M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" 
                  fill="white"/>
          </svg>
        </button>
        ` : ''}
      </figure>
      
      <!-- Action Buttons -->
      <div class="story-actions">
        <!-- Left Side: Like and Comment -->
        <div class="action-group-left">
          <div class="like-container">
            <button class="icon-button" id="likeButton" data-liked="${story.isLiked}" aria-label="Suka" ${this.isOfflineStory ? 'disabled' : ''}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${story.isLiked ? 'red' : 'none'}" stroke="#262626" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <span class="likes-count">${story.likes || 0} suka</span>
          </div>

          <div class="comments-container">
            <button class="icon-button comment-button" id="commentButton" aria-label="Komentar" ${this.isOfflineStory ? 'disabled' : ''}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
              </svg>
            </button>
            <span class="comments-count">${story.comments || 0} komentar</span>
          </div>
        </div>
        
        <!-- Right Side: Save Button -->
        <div class="action-group-right">
          <div class="save-container">
            <button class="icon-button" id="saveButton" data-saved="${isSaved}" aria-label="${isSaved ? 'Hapus dari penyimpanan' : 'Simpan untuk offline'}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${isSaved ? '#4285F4' : 'none'}" stroke="#262626" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <span class="save-text">${isSaved ? 'Tersimpan' : 'Simpan'}</span>
          </div>
        </div>
      </div>
      
      <!-- Story Caption -->
      <div class="story-caption">
        <p>${formattedDescription}</p>
      </div>
      
      <!-- Story Date -->
      <div class="story-date-detail">
        ${showFormattedDate(story.createdAt)}
      </div>
      
      <!-- Comments Section -->
      ${story.comments?.length > 0 ? `
        <div class="comments-section">
          <h3 class="comments-title">Komentar</h3>
          <div class="comments-list">
            ${story.comments.map(comment => `
              <div class="comment-item">
                <img src="${comment.avatar || './public/images/default-avatar.png'}" 
                     alt="${comment.name}" 
                     class="comment-avatar">
                <div class="comment-content">
                  <div class="comment-header">
                    <strong class="comment-author">${comment.name}</strong>
                    <p class="comment-text">${comment.content}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </article>
  `;
  
  if (story.lat && story.lon) {
    this.setupMapButton(story.lat, story.lon);
  }
}

  setupEventListeners() {
    const likeButton = document.getElementById('likeButton');
    if (likeButton) {
      likeButton.addEventListener('click', () => this.handleLike());
    }

    const commentButton = document.getElementById('commentButton');
    if (commentButton) {
      commentButton.addEventListener('click', () => this.showCommentDialog());
    }

    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.handleSaveStory());
    }

    const subscribeButton = document.getElementById('subscribeButton');
    if (subscribeButton) {
      subscribeButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleStorySubscription();
        await this._updateSubscribeButton();
      });
    }

    const backButton = document.querySelector('.back-button');
    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.back();
      });
    }
  }

  async handleSaveStory() {
    try {
      const saveButton = document.getElementById('saveButton');
      const isSaved = saveButton.getAttribute('data-saved') === 'true';
      
      if (isSaved) {
        await StoryDB.deleteStory(this.storyId);
        saveButton.setAttribute('data-saved', 'false');
        saveButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        `;
        document.querySelector('.save-text').textContent = 'Simpan';
        Swal.fire('Berhasil', 'Cerita dihapus dari penyimpanan offline', 'success');
      } else {
        const storyToSave = {
          ...this.storyData.story,
          id: this.storyId,
          savedAt: new Date().toISOString()
        };
        
        await StoryDB.saveStory(storyToSave);
        saveButton.setAttribute('data-saved', 'true');
        saveButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#4285F4" stroke="#262626" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        `;
        document.querySelector('.save-text').textContent = 'Tersimpan';
        Swal.fire('Berhasil', 'Cerita disimpan untuk dibaca offline', 'success');
      }
    } catch (error) {
      console.error('Error saving story:', error);
      Swal.fire('Error', 'Gagal menyimpan cerita', 'error');
    }
  }

  setupMapButton(lat, lon) {
    const showLocationBtn = document.getElementById('showLocation');
    if (showLocationBtn) {
      showLocationBtn.addEventListener('click', () => {
        Swal.fire({
          title: 'Lokasi Cerita',
          html: `
            <div class="map-container" style="height: 300px;">
              <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed">
              </iframe>
            </div>
            <p class="map-coordinates" style="margin-top: 1rem;">
              Koordinat: ${lat}, ${lon}
            </p>
          `,
          showConfirmButton: false,
          showCloseButton: true
        });
      });
    }
  }

async handleLike() {
  const likeButton = document.getElementById('likeButton');
  
  try {
    if (this.isOfflineStory) {
      await Swal.fire('Info', 'Fitur like tidak tersedia untuk cerita offline', 'info');
      return;
    }

    if (!likeButton) {
      console.error('Tombol like tidak ditemukan');
      return;
    }

    const isLiked = likeButton.getAttribute('data-liked') === 'true';
    const token = AuthService.getToken();
    const newLikeState = !isLiked;

    if (!token) {
      const result = await Swal.fire({
        title: 'Login Diperlukan',
        text: 'Anda harus login untuk memberikan like',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Login',
        cancelButtonText: 'Batal'
      });
      
      if (result.isConfirmed) {
        window.location.hash = '#/login';
      }
      return;
    }

    likeButton.disabled = true;
    likeButton.innerHTML = '<div class="spinner"></div>';

    const response = await StoryApiService.toggleLike(
      token, 
      this.storyId, 
      newLikeState
    );

    if (!response.success) {
      throw new Error(response.message || 'Operasi like gagal');
    }

    likeButton.setAttribute('data-liked', newLikeState);
    likeButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${newLikeState ? 'red' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    `;

    const likesCount = document.querySelector('.likes-count');
    if (likesCount) {
      const currentCount = parseInt(likesCount.textContent) || 0;
      likesCount.textContent = newLikeState 
        ? `${currentCount + 1} suka` 
        : `${currentCount - 1} suka`;
    }

  } catch (error) {
    console.error('Error pada handleLike:', error);
    if (likeButton) {
      const currentState = likeButton.getAttribute('data-liked') === 'true';
      likeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${currentState ? 'red' : 'none'}" stroke="#262626" stroke-width="2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      `;
    }
    let errorMessage = 'Gagal memperbarui like';
    
    if (error.message.includes('Network Error')) {
      errorMessage = 'Masalah koneksi jaringan';
    } else if (error.message.includes('401')) {
      errorMessage = 'Sesi login telah berakhir';
    } else if (error.message.includes('404')) {
      errorMessage = 'Cerita tidak ditemukan';
    }

    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      footer: error.response?.data?.message || '',
      confirmButtonText: 'OK'
    });

  } finally {
    if (likeButton) {
      likeButton.disabled = false;
    }
  }
}

  showCommentDialog() {
    Swal.fire({
      title: 'Tambah Komentar',
      input: 'textarea',
      inputPlaceholder: 'Tulis komentar Anda...',
      inputAttributes: {
        'aria-label': 'Tulis komentar Anda di sini'
      },
      showCancelButton: true,
      confirmButtonText: 'Kirim',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      preConfirm: async (comment) => {
        if (!comment.trim()) {
          Swal.showValidationMessage('Komentar tidak boleh kosong');
          return false;
        }
        
        try {
          const token = AuthService.getToken();
          const response = await StoryApiService.addComment(
            token,
            this.storyId,
            comment
          );
          
          if (!response.success) {
            throw new Error(response.message);
          }
          
          return response;
        } catch (error) {
          Swal.showValidationMessage(`Gagal: ${error.message}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Berhasil!', 'Komentar Anda telah ditambahkan', 'success');
        this.loadStory();
      }
    });
  }

  showError(message) {
    document.getElementById('storyDetail').innerHTML = `
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Gagal Memuat Cerita</h3>
        <p>${message}</p>
        <a href="#/" class="home-link">Kembali ke Beranda</a>
      </div>
    `;
  }
}