import StoryDB from '../database';
import { showFormattedDate } from '../utils';
import Swal from 'sweetalert2';

export default class BookmarkPage {
  constructor() {
    this.bookmarkedStories = [];
  }

  async render() {
    return `
      <section class="bookmark-page">
        <div class="bookmark-header">
          <h2>Cerita Tersimpan</h2>
        </div>
        <div id="bookmarkList" class="bookmark-list">
          <!-- Daftar cerita akan dimuat di sini -->
          <div class="skeleton-loading">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadBookmarkedStories();
  }

  async loadBookmarkedStories() {
    try {
      const listContainer = document.getElementById('bookmarkList');
      
      listContainer.innerHTML = `
        <div class="skeleton-loading">
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
        </div>
      `;

      this.bookmarkedStories = await StoryDB.getAllStories();
      
      if (this.bookmarkedStories.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Belum ada cerita tersimpan</h3>
            <p>Simpan cerita favorit Anda untuk dibaca offline</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = this.bookmarkedStories.map(story => `
        <article class="bookmark-item" data-id="${story.id}">
          <div class="bookmark-content">
            <h2>${story.name}</h2>
            <p class="bookmark-date">${showFormattedDate(story.createdAt)}</p>
            <p class="bookmark-description">${story.description.substring(0, 100)}...</p>
          </div>
          <div class="bookmark-actions">
            <button class="read-button" data-id="${story.id}">Baca</button>
            <button class="delete-button" data-id="${story.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4444">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </article>
      `).join('');

      document.querySelectorAll('.read-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const storyId = e.target.getAttribute('data-id');
          window.location.hash = `#/detail/${storyId}`;
        });
      });

      document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async (e) => {
          const storyId = e.target.closest('button').getAttribute('data-id');
          await this.deleteBookmark(storyId);
        });
      });

    } catch (error) {
      console.error('Error loading bookmarks:', error);
      document.getElementById('bookmarkList').innerHTML = `
        <div class="error-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff4444">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>Gagal memuat bookmark</h3>
          <p>${error.message}</p>
          <button id="retryButton" class="retry-button">Coba Lagi</button>
        </div>
      `;

      document.getElementById('retryButton').addEventListener('click', () => {
        this.loadBookmarkedStories();
      });
    }
  }

  async deleteBookmark(storyId) {
    try {
      const result = await Swal.fire({
        title: 'Hapus Bookmark?',
        text: 'Cerita akan dihapus dari daftar tersimpan',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Hapus',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        await StoryDB.deleteStory(storyId);
        await this.loadBookmarkedStories();
        Swal.fire('Berhasil!', 'Cerita dihapus dari bookmark', 'success');
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      Swal.fire('Error', 'Gagal menghapus bookmark', 'error');
    }
  }
}