import { openDB } from 'idb';

const DATABASE_NAME = 'citycare';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'saved-stories';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade: (database) => {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: 'id',
      });
    }
  },
});

const StoryDB = {
  async getStory(id) {
    if (!id) return undefined;
    // Pastikan id string
    return (await dbPromise).get(OBJECT_STORE_NAME, String(id));
  },

  async getAllStories() {
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },

  async saveStory(story) {
    // Pastikan ada id dan id string
    if (!story || !story.id) throw new Error('Story harus memiliki id');
    story.id = String(story.id);
    // Gunakan put agar upsert (insert/update)
    const result = await (await dbPromise).put(OBJECT_STORE_NAME, story);
    // Debug log
    // console.log('Story saved to IndexedDB:', story);
    return result;
  },

  async updateStory(id, newData) {
    if (!id) throw new Error('ID diperlukan untuk update');
    id = String(id);
    const db = await dbPromise;
    const existing = await db.get(OBJECT_STORE_NAME, id);
    if (!existing) throw new Error('Story tidak ditemukan');
    const updated = { ...existing, ...newData, id };
    return db.put(OBJECT_STORE_NAME, updated);
  },

  async deleteStory(id) {
    if (!id) return;
    return (await dbPromise).delete(OBJECT_STORE_NAME, String(id));
  },

  async isStorySaved(id) {
    return (await this.getStory(id)) !== undefined;
  }
};

export default StoryDB;