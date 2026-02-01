import toast from 'svelte-french-toast';

export interface OllamaModel {
	name: string;
	modified_at: string;
	size: number;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export const checkConnection = async (baseUrl: string): Promise<boolean> => {
	try {
		const res = await fetch(`${baseUrl}/api/tags`);
		return res.ok;
	} catch (e) {
		return false;
	}
};

export const getModels = async (baseUrl: string): Promise<OllamaModel[]> => {
	const toastId = toast.loading('Fetching models...');
	try {
		const res = await fetch(`${baseUrl}/api/tags`);
		if (!res.ok) throw new Error('Failed to fetch models');
		const data = await res.json();
		toast.success('Models loaded!', { id: toastId });
		return data.models || [];
	} catch (e) {
		const errorMessage = e instanceof Error && e.message ? e.message : 'failed to fetch models';
		toast.error(errorMessage, { id: toastId });
		console.error(e);
		return [];
	}
};

export const generateEmbedding = async (
	baseUrl: string,
	model: string,
	prompt: string
): Promise<number[]> => {
	try {
		const response = await fetch(`${baseUrl}/api/embeddings`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model, prompt })
		});

		if (!response.ok) throw new Error('Failed to generate embedding');
		const data = await response.json();
		return data.embedding;
	} catch (e) {
		console.error('Embedding error', e);
		throw e;
	}
};

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
	const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
	const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
	const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
	return dotProduct / (magA * magB);
};

export const streamChat = async (
	baseUrl: string,
	model: string,
	messages: ChatMessage[],
	onChunk: (chunk: string) => void,
	signal?: AbortSignal
) => {
	try {
		const response = await fetch(`${baseUrl}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
				messages,
				stream: true
			}),
			signal
		});

		if (!response.body) throw new Error('No response body');

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split('\n');
			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const json = JSON.parse(line);
					if (json.message && json.message.content) {
						onChunk(json.message.content);
					}
					if (json.done) {
						return;
					}
				} catch (e) {
					console.error('Error parsing JSON chunk', e);
				}
			}
		}
	} catch (e: any) {
		if (e.name === 'AbortError') {
			console.log('Chat stream aborted');
			return;
		}
		console.error('Chat error', e);
		throw e;
	}
};
