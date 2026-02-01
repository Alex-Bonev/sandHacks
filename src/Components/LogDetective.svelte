<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import {
		Bug,
		Play,
		Loader2,
		AlertCircle,
		FileText,
		Search,
		CheckCircle,
		Link,
		FolderInput,
		Github,
		Laptop
	} from 'lucide-svelte';
	import { streamChat, type ChatMessage } from '../lib/ollama';
	import { fetchFileContent, parseRepoUrl, fetchRepoTree, type GitHubFile } from '../lib/github';
	import { getSetting, saveSetting } from '../lib/storage';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { marked } from 'marked';
	import { cn } from '../utils/cn';

	let { selectedModel, repoUrl: initialRepoUrl = '' } = $props<{
		selectedModel: string;
		repoUrl?: string;
	}>();

	let mode = $state<'github' | 'local'>('github');
	let logs = $state('');
	let githubUrl = $state(initialRepoUrl);
	let githubFiles = $state<GitHubFile[]>([]);
	let isGithubLoading = $state(false);
	let githubReady = $state(false);
	let localFiles = $state<File[]>([]);
	let isAnalyzing = $state(false);
	let analysisResult = $state('');
	let identifiedLocation = $state<{ file: string; line: number; code?: string } | null>(null);
	let abortController = $state<AbortController | null>(null);
	let ollamaUrl = $state('http://localhost:11434');
	let mounted = $state(false);

	onMount(async () => {
		if (!githubUrl) {
			const stored = await getSetting('last_repo_url');
			if (stored) githubUrl = stored;
		}
		if (initialRepoUrl) {
			loadGithubRepo();
		}
		setTimeout(() => (mounted = true), 50);
	});

	const loadGithubRepo = async () => {
		if (!githubUrl) return;
		isGithubLoading = true;
		githubReady = false;
		githubFiles = [];

		try {
			const repoInfo = parseRepoUrl(githubUrl);
			if (!repoInfo) throw new Error('Invalid GitHub URL');

			const token = await getSetting('github_token');
			const tree = await fetchRepoTree(repoInfo.owner, repoInfo.repo, token || undefined);

			githubFiles = tree;
			githubReady = true;
			saveSetting('last_repo_url', githubUrl);
			toast.success(`Loaded repository: ${tree.length} files`);
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			isGithubLoading = false;
		}
	};

	const handleLocalFolderSelect = async (e: Event) => {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length) return;

		const files = Array.from(input.files);
		const validFiles = files.filter(
			(f) =>
				!f.webkitRelativePath.includes('node_modules') && !f.webkitRelativePath.includes('.git')
		);

		localFiles = validFiles;
		toast.success(`Loaded ${validFiles.length} local files`);
		input.value = '';
	};

	const tracePatterns = [
		/at\s+.*?\s+\(?([^:)]+):(\d+):(\d+)\)?/,
		/File\s+"([^"]+)",\s+line\s+(\d+)/,
		/([a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+):(\d+)/
	];

	const parseTrace = (log: string) => {
		for (const pattern of tracePatterns) {
			const match = log.match(pattern);
			if (match) {
				return {
					file: match[1],
					line: parseInt(match[2], 10)
				};
			}
		}
		return null;
	};

	const findFileInContext = (tracePath: string): { type: 'github' | 'local'; ref: any } | null => {
		const normalizedTrace = tracePath.replace(/\\/g, '/');

		if (mode === 'github') {
			const match = githubFiles.find(
				(f) => f.path.endsWith(normalizedTrace) || normalizedTrace.endsWith(f.path)
			);
			if (match) return { type: 'github', ref: match };

			const filename = normalizedTrace.split('/').pop();
			if (filename) {
				const fuzzy = githubFiles.find((f) => f.path.endsWith(filename));
				if (fuzzy) return { type: 'github', ref: fuzzy };
			}
		} else {
			const match = localFiles.find(
				(f) =>
					f.webkitRelativePath.endsWith(normalizedTrace) ||
					normalizedTrace.endsWith(f.webkitRelativePath)
			);
			if (match) return { type: 'local', ref: match };

			const filename = normalizedTrace.split('/').pop();
			if (filename) {
				const fuzzy = localFiles.find((f) => f.name === filename);
				if (fuzzy) return { type: 'local', ref: fuzzy };
			}
		}
		return null;
	};

	const handleAnalyze = async () => {
		if (!logs.trim()) return toast.error('Please paste a stack trace');
		if (!selectedModel) return toast.error('Select a model');
		if (mode === 'github' && !githubReady) return toast.error('Please load the repository first');
		if (mode === 'local' && localFiles.length === 0)
			return toast.error('Please upload a folder first');

		isAnalyzing = true;
		analysisResult = '';
		identifiedLocation = null;
		abortController = new AbortController();

		try {
			const match = parseTrace(logs);
			let codeContext = '';

			if (match) {
				const found = findFileInContext(match.file);

				if (found) {
					let content = '';
					let filePath = '';

					if (found.type === 'github') {
						const token = await getSetting('github_token');
						const repoInfo = parseRepoUrl(githubUrl);
						if (repoInfo) {
							content = await fetchFileContent(
								repoInfo.owner,
								repoInfo.repo,
								found.ref.path,
								token || undefined
							);
							filePath = found.ref.path;
						}
					} else {
						content = await found.ref.text();
						filePath = found.ref.webkitRelativePath;
					}

					if (content) {
						const lines = content.split('\n');
						const start = Math.max(0, match.line - 10);
						const end = Math.min(lines.length, match.line + 10);

						const snippet = lines
							.slice(start, end)
							.map((l, i) => {
								const lineNum = start + i + 1;
								return `${lineNum === match.line ? '>>> ' : '    '}${lineNum} | ${l}`;
							})
							.join('\n');

						identifiedLocation = { file: filePath, line: match.line, code: snippet };
						codeContext = `\n\nRelated Code (${filePath}:${match.line}):\n${snippet}\n`;
					}
				} else {
					codeContext = `\n(File '${match.file}' not found in loaded context. Analysis based on logs only.)`;
				}
			} else {
				codeContext = '\n(No file path identified in stack trace)';
			}

			const url = (await getSetting('ollama_url')) || 'http://localhost:11434';
			const messages: ChatMessage[] = [
				{
					role: 'system',
					content: `You are a Senior Debugging Assistant. 
              Analyze the stack trace and the provided code context.
              Explain WHY the crash happened and EXACTLY how to fix it.
              Be concise.`
				},
				{
					role: 'user',
					content: `Error Log:\n${logs}\n${codeContext}`
				}
			];

			await streamChat(
				url,
				selectedModel,
				messages,
				(chunk) => {
					analysisResult += chunk;
				},
				abortController.signal
			);
		} catch (e: any) {
			if (e.name !== 'AbortError') {
				toast.error(e.message);
			}
		} finally {
			isAnalyzing = false;
			abortController = null;
		}
	};

	const stopAnalysis = () => {
		if (abortController) {
			abortController.abort();
			isAnalyzing = false;
		}
	};
</script>

<div class="flex h-full flex-col bg-gradient-to-b from-blue-50/30 to-white">
	<!-- Header -->
	{#if mounted}
		<div
			class="border-b border-blue-100 bg-white p-6 shadow-sm"
			transition:fly={{ y: -20, duration: 400 }}
		>
			<div class="mx-auto flex max-w-6xl flex-col gap-6">
				<div class="flex items-start justify-between">
					<div>
						<h1 class="flex items-center gap-3 font-serif text-2xl font-bold text-gray-800">
							<div
								class="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-lg"
							>
								<Bug class="h-6 w-6" />
							</div>
							Log Detective
						</h1>
						<p class="mt-2 font-serif text-sm text-gray-500">
							Paste a stack trace. Local AI finds the file, reads the code, and fixes the crash.
						</p>
					</div>

					<!-- Mode Switcher -->
					<div class="flex gap-1 rounded-xl bg-gray-100 p-1">
						<button
							onclick={() => (mode = 'github')}
							class={cn(
								'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200',
								mode === 'github'
									? 'bg-white text-blue-700 shadow-sm'
									: 'text-gray-500 hover:text-gray-700'
							)}
						>
							<Github class="h-3.5 w-3.5" /> GitHub
						</button>
						<button
							onclick={() => (mode = 'local')}
							class={cn(
								'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200',
								mode === 'local'
									? 'bg-white text-blue-700 shadow-sm'
									: 'text-gray-500 hover:text-gray-700'
							)}
						>
							<Laptop class="h-3.5 w-3.5" /> Local
						</button>
					</div>
				</div>

				<!-- Context Source Input -->
				<div class="rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
					{#if mode === 'github'}
						<label
							class="mb-3 block font-serif text-xs font-semibold tracking-wider text-blue-800 uppercase"
							>Linked Repository</label
						>
						<div class="flex gap-2" transition:slide={{ duration: 200 }}>
							<div class="group relative flex-1">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
									<Link class="h-4 w-4 text-gray-400" />
								</div>
								<input
									type="text"
									bind:value={githubUrl}
									onkeydown={(e) => e.key === 'Enter' && loadGithubRepo()}
									placeholder="https://github.com/owner/repo"
									class="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-11 font-mono text-sm shadow-sm transition-all duration-200 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
								/>
							</div>
							<button
								onclick={loadGithubRepo}
								disabled={isGithubLoading || !githubUrl}
								class="flex min-w-[100px] items-center justify-center rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
							>
								{#if isGithubLoading}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else}
									Load
								{/if}
							</button>
						</div>
						{#if githubReady}
							<div
								class="mt-3 flex items-center gap-2 font-serif text-xs font-medium text-green-600"
								transition:fade={{ duration: 200 }}
							>
								<CheckCircle class="h-3.5 w-3.5" /> Repository ready ({githubFiles.length} files indexed)
							</div>
						{/if}
					{:else}
						<label
							class="mb-3 block font-serif text-xs font-semibold tracking-wider text-blue-800 uppercase"
							>Local Source</label
						>
						<div class="group relative" transition:slide={{ duration: 200 }}>
							<div
								class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-white p-6 text-gray-500 transition-all duration-300 group-hover:border-blue-400 group-hover:bg-blue-50"
							>
								<FolderInput
									class="mb-2 h-6 w-6 text-blue-400 transition-transform duration-200 group-hover:scale-110"
								/>
								<span class="font-serif text-sm font-medium">
									{localFiles.length > 0
										? `${localFiles.length} local files ready`
										: 'Click to select local project folder'}
								</span>
								<input
									type="file"
									webkitdirectory={''}
									directory={''}
									multiple
									class="absolute inset-0 cursor-pointer opacity-0"
									onchange={handleLocalFolderSelect}
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="mx-auto flex w-full max-w-6xl flex-1 gap-6 overflow-hidden p-6">
		<!-- Left: Log Input -->
		{#if mounted}
			<div class="flex w-1/2 flex-col gap-4" transition:fly={{ x: -30, duration: 400, delay: 100 }}>
				<div
					class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
				>
					<div
						class="flex items-center justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4 font-serif font-semibold text-gray-700"
					>
						<span class="flex items-center gap-2"
							><FileText class="h-4 w-4 text-blue-600" /> Crash Logs</span
						>
						<button
							onclick={() => (logs = '')}
							class="rounded-lg px-3 py-1 text-xs text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
							>Clear</button
						>
					</div>
					<textarea
						bind:value={logs}
						placeholder="Paste stack trace here..."
						class="w-full flex-1 resize-none bg-gray-50/30 p-4 font-mono text-xs outline-none focus:bg-white"
					></textarea>
				</div>

				<button
					onclick={isAnalyzing ? stopAnalysis : handleAnalyze}
					disabled={!isAnalyzing && (!logs.trim() || !selectedModel)}
					class={cn(
						'flex w-full transform items-center justify-center gap-2 rounded-xl py-4 font-serif text-sm font-bold shadow-sm transition-all duration-300 active:scale-[0.99]',
						isAnalyzing
							? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
							: 'bg-gradient-to-b from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 disabled:opacity-50'
					)}
				>
					{#if isAnalyzing}
						<Loader2 class="h-4 w-4 animate-spin" /> Stop Analysis
					{:else}
						<Search class="h-4 w-4" /> Analyze Error
					{/if}
				</button>
			</div>
		{/if}

		<!-- Right: Analysis Results -->
		{#if mounted}
			<div class="flex w-1/2 flex-col gap-4" transition:fly={{ x: 30, duration: 400, delay: 150 }}>
				{#if identifiedLocation}
					<div
						class="overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm max-h-[40%] flex flex-col"
						transition:fly={{ y: -20, duration: 300 }}
					>
						<div
							class="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 font-serif text-sm font-bold text-gray-800 shrink-0"
						>
							<div class="rounded-lg bg-blue-50 p-1.5 text-blue-600">
								<Search class="h-3.5 w-3.5" />
							</div>
							Detected Source:
							<span class="font-mono text-blue-600"
								>{identifiedLocation.file}:{identifiedLocation.line}</span
							>
						</div>
						{#if identifiedLocation.code}
							<div
								class="overflow-auto rounded-xl border border-gray-800 bg-[#1e1e1e] p-4 shadow-inner flex-1 min-h-0"
							>
								<pre
									class="font-mono text-[10px] leading-relaxed whitespace-pre text-gray-300">{identifiedLocation.code}</pre>
							</div>
						{:else}
							<p class="rounded-xl bg-gray-50 p-3 font-serif text-xs text-gray-500 italic">
								File content could not be retrieved automatically.
							</p>
						{/if}
					</div>
				{/if}

				<div
					class="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
				>
					<div
						class="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4 font-serif font-semibold text-gray-700"
					>
						<span class="flex items-center gap-2"
							><Bug class="h-4 w-4 text-blue-600" /> Diagnosis</span
						>
					</div>
					<div class="prose prose-sm max-w-none flex-1 overflow-y-auto p-6 prose-blue">
						{#if analysisResult}
							<div transition:fade={{ duration: 200 }}>
								{@html marked.parse(analysisResult)}
							</div>
						{:else if !isAnalyzing}
							<div
								class="flex h-full flex-col items-center justify-center space-y-4 text-gray-300"
								transition:fade={{ duration: 200 }}
							>
								<div class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
									<Bug class="h-10 w-10 opacity-20" />
								</div>
								<p class="font-serif text-xs font-medium">Waiting for logs...</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap');
</style>
