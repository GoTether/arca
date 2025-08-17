// Minimal local storage for Arcas (name/description/location). Expand later.
export const storage = {
  async getArca(userId, id) {
    const key = k(`arca:${userId}:${normalizeId(id)}`);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  async createArca(userId, data) {
    const now = new Date().toISOString();
    const arca = {
      id: normalizeId(data.id),
      name: data.name,
      description: data.description || '',
      location: data.location || '',
      photoId: null,
      items: [],
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1
    };
    const key = k(`arca:${userId}:${arca.id}`);
    localStorage.setItem(key, JSON.stringify(arca));
    indexId(userId, arca.id);
    return arca;
  },

  async updateArca(userId, id, patch) {
    const key = k(`arca:${userId}:${normalizeId(id)}`);
    const arca = JSON.parse(localStorage.getItem(key) || 'null');
    if (!arca) return null;
    Object.assign(arca, patch);
    arca.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(arca));
    return arca;
  },

  async listArcas(userId) {
    const idxKey = k(`arcaIndex:${userId}`);
    const ids = JSON.parse(localStorage.getItem(idxKey) || '[]');
    const out = [];
    for (const id of ids) {
      const a = await this.getArca(userId, id);
      if (a) out.push(a);
    }
    out.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return out;
  }
};

function k(s) { return `tether:${s}`; }

function indexId(userId, id) {
  const idxKey = k(`arcaIndex:${userId}`);
  const ids = JSON.parse(localStorage.getItem(idxKey) || '[]');
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(idxKey, JSON.stringify(ids));
  }
}

export function normalizeId(raw) {
  return String(raw).trim().replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
}
