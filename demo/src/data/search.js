export function searchIndex(documents) {
  const index = new Map();
  documents.forEach((doc) => {
    const words = doc.text.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (!index.has(word)) index.set(word, []);
      index.get(word).push(doc.id);
    });
  });
  return index;
}

export function search(index, query) {
  const words = query.toLowerCase().split(/\s+/);
  const results = words.map((w) => index.get(w) || []);
  return results.length ? results.reduce((a, b) => a.filter((id) => b.includes(id))) : [];
}
