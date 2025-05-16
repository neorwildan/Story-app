export default class NotFoundPage {
  async render() {
    return `
      <section class="not-found-page" style="text-align:center; padding: 4rem 1rem;">
        <h1 style="font-size:3rem; color:#e74c3c;">404</h1>
        <h2>Halaman Tidak Ditemukan</h2>
        <p>Maaf, halaman yang Anda cari tidak tersedia.</p>
        <a href="#/" class="retry-button" style="margin-top:2rem;display:inline-block;">Kembali ke Beranda</a>
      </section>
    `;
  }
  async afterRender() {}
}
