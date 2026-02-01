import { generateEmbedding, cosineSimilarity } from './ollama';

export interface RAGDocument {
  path: string;
  content: string;
  embedding: number[];
}

class VectorStore {
  private documents: RAGDocument[] = [];
  private baseUrl: string = 'http://localhost:11434';
  private model: string = '';

  configure(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async addDocument(path: string, content: string) {
    if (!this.model) throw new Error('Model not configured');
    const embedding = await generateEmbedding(this.baseUrl, this.model, content);
    
    // Remove existing if updating
    this.documents = this.documents.filter(d => d.path !== path);
    
    this.documents.push({ path, content, embedding });
  }

  async search(query: string, limit: number = 3): Promise<RAGDocument[]> {
    if (this.documents.length === 0) return [];
    
    const queryEmbedding = await generateEmbedding(this.baseUrl, this.model, query);
    
    const results = this.documents.map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map(r => r.doc);
  }

  get count() {
    return this.documents.length;
  }
  
  clear() {
    this.documents = [];
  }
}

export const store = new VectorStore();