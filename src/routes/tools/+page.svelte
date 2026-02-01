<script lang="ts">
	import RepoExplorer from '../../components/RepoExplorer.svelte';
	import Settings from '../../components/Settings.svelte';
	import Chat from '../../components/Chat.svelte';
	import BatchRefactor from '../../components/BatchRefactor.svelte';
	import SecurityScan from '../../components/SecurityScan.svelte';
	import LogDetective from '../../Components/LogDetective.svelte';
	import LocalLogger from '../../components/LocalLogger.svelte';

	import { getModels, type OllamaModel } from '../../lib/ollama';
	import { getSetting, saveSetting } from '../../lib/storage';

	import type { GitHubFile, BranchComparison, PullRequest } from '../../lib/github';
	import {
		Github,
		FileDiff,
		ChevronDown,
		Layout,
		Home,
		Cpu,
		RefreshCw,
		Check,
		Star,
		ShieldCheck,
		Bug,
		FileText
	} from 'lucide-svelte';
	import { cn } from '../../utils/cn';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	// --- State ---
	let currentRepoUrl = $state('');
	let selectedFiles = $state<GitHubFile[]>([]);
	let activeFile = $state<GitHubFile | null>(null);
	let branchComparison = $state<BranchComparison | null>(null);
	let selectedBranchNames = $state<string[]>([]);
	let selectedPR = $state<PullRequest | null>(null);
	let ollamaUrl = $state('http://localhost:11434');
	let models = $state<OllamaModel[]>([]);
	let selectedModel = $state('');
	let defaultModel = $state('');

	// Navigation State
	let activeTool = $state<'repo' | 'batch' | 'security' | 'logs' | 'logger'>('repo');
	let isDropdownOpen = $state(false);

	// New: Lifted Tab State
	let activeExplorerTab = $state<'files' | 'prs' | 'branches'>('files');

	// --- Handlers ---
	const handleSelectionChange = (files: GitHubFile[]) => {
		selectedFiles = files;
	};

	const handleTabChange = (tab: 'files' | 'prs' | 'branches') => {
		activeExplorerTab = tab;
		if (tab !== 'prs') selectedPR = null;
	};

	const handleToolSwitch = (
		tool: 'landing' | 'repo' | 'batch' | 'security' | 'logs' | 'logger'
	) => {
		if (tool === 'landing') {
			window.location.href = '/';
			return;
		}
		activeTool = tool;
		isDropdownOpen = false;
	};

	// Click outside to close dropdown
	const handleOutsideClick = (e: MouseEvent) => {
		if (isDropdownOpen && !(e.target as Element).closest('#tool-dropdown')) {
			isDropdownOpen = false;
		}
	};

	onMount(async () => {
		// 1. Get URL
		const url = await getSetting('ollama_url');
		if (url) ollamaUrl = url;

		// 2. Get Default Model
		const def = await getSetting('default_model');
		if (def) defaultModel = def;

		// 3. Fetch Models
		try {
			const list = await getModels(ollamaUrl);
			models = list;

			// Priority: Default -> First Available
			if (models.length > 0) {
				if (def && models.some((m) => m.name === def)) {
					selectedModel = def;
				} else {
					selectedModel = models[0].name;
				}
			}
		} catch (e) {
			console.error('Failed to fetch models', e);
		}
	});

	const loadConfig = async () => {
		const url = await getSetting('ollama_url');
		if (url) {
			ollamaUrl = url;
			fetchModels(url);
		} else {
			fetchModels(ollamaUrl);
		}
	};

	const fetchModels = async (url: string) => {
		const list = await getModels(url);
		models = list;
		if (list.length > 0 && !selectedModel) {
			selectedModel = list[0].name;
		}
	};

	const handleSetDefault = async () => {
		if (!selectedModel) return;
		await saveSetting('default_model', selectedModel);
		defaultModel = selectedModel;
		toast.success(`${selectedModel} is now the default model.`);
	};
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="flex h-screen w-screen flex-col overflow-hidden bg-white font-sans text-slate-900">
	<!-- Header with Dropdown -->
	<div
		class="z-50 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
	>
		<!-- Dropdown Menu Container -->
		<div class="relative" id="tool-dropdown">
			<button
				onclick={() => (isDropdownOpen = !isDropdownOpen)}
				class="group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
			>
				<!-- Logo Icon based on current tool -->
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-all group-hover:shadow"
				>
					{#if activeTool === 'repo'}
						<Github class="h-5 w-5" />
					{:else if activeTool == 'batch'}
						<FileDiff class="h-5 w-5" />
					{:else if activeTool == 'security'}
						<ShieldCheck class="h-5 w-5" />
					{:else if activeTool == 'logs'}
						<Bug class="h-5 w-5" />
					{:else if activeTool == 'logger'}
						<FileText class="h-5 w-5" />
					{/if}
				</div>

				<div class="text-left">
					<div class="mb-0.5 text-[10px] leading-none font-medium text-gray-500">Current Tool</div>
					<div class="flex items-center gap-1 leading-none font-bold text-gray-800">
						{#if activeTool === 'repo'}
							Repo Review
						{:else if activeTool == 'batch'}
							Infinite Refactor
						{:else if activeTool == 'security'}
							Security Scan
						{:else if activeTool == 'logs'}
							Log Detective
						{:else if activeTool == 'logger'}
							Local Logger
						{/if}
						<ChevronDown
							class={cn(
								'h-3.5 w-3.5 text-gray-400 transition-transform duration-200',
								isDropdownOpen && 'rotate-180'
							)}
						/>
					</div>
				</div>
			</button>

			{#if isDropdownOpen}
				<div
					class="animate-in fade-in zoom-in-95 absolute top-full left-0 mt-2 w-56 origin-top-left overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl duration-100"
				>
					<div class="px-3 py-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
						Navigate
					</div>

					<button
						onclick={() => handleToolSwitch('landing')}
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600"
					>
						<Home class="h-4 w-4 text-gray-400" /> Landing Page
					</button>

					<div class="my-1 border-t border-gray-100"></div>
					<div class="px-3 py-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
						Tools
					</div>

					<button
						onclick={() => handleToolSwitch('repo')}
						disabled={activeTool === 'repo'}
						class={cn(
							'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
							activeTool === 'repo'
								? 'cursor-default bg-blue-50 text-blue-700 opacity-100'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
						)}
					>
						<Github
							class={cn('h-4 w-4', activeTool === 'repo' ? 'text-blue-600' : 'text-gray-400')}
						/>
						Repo Review
						{#if activeTool === 'repo'}
							<span
								class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
								>ACTIVE</span
							>
						{/if}
					</button>

					<button
						onclick={() => handleToolSwitch('batch')}
						disabled={activeTool === 'batch'}
						class={cn(
							'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
							activeTool === 'batch'
								? 'cursor-default bg-blue-50 text-blue-700 opacity-100'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
						)}
					>
						<FileDiff
							class={cn('h-4 w-4', activeTool === 'batch' ? 'text-blue-600' : 'text-gray-400')}
						/>
						Infinite Refactor
						{#if activeTool === 'batch'}
							<span
								class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
								>ACTIVE</span
							>
						{/if}
					</button>
					<button
						onclick={() => handleToolSwitch('security')}
						disabled={activeTool === 'security'}
						class={cn(
							'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
							activeTool === 'security'
								? 'cursor-default bg-blue-50 text-blue-700 opacity-100'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
						)}
					>
						<ShieldCheck
							class={cn('h-4 w-4', activeTool === 'security' ? 'text-blue-600' : 'text-gray-400')}
						/>
						Security Scan
						{#if activeTool === 'security'}
							<span
								class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
								>ACTIVE</span
							>
						{/if}
					</button>
					<button
						onclick={() => handleToolSwitch('logs')}
						disabled={activeTool === 'logs'}
						class={cn(
							'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
							activeTool === 'logs'
								? 'cursor-default bg-blue-50 text-blue-700 opacity-100'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
						)}
					>
						<Bug class={cn('h-4 w-4', activeTool === 'logs' ? 'text-blue-600' : 'text-gray-400')} />
						Log Detective
						{#if activeTool === 'logs'}
							<span
								class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
								>ACTIVE</span
							>
						{/if}
					</button>
					<button
						onclick={() => handleToolSwitch('logger')}
						disabled={activeTool === 'logger'}
						class={cn(
							'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
							activeTool === 'logger'
								? 'cursor-default bg-blue-50 text-blue-700 opacity-100'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
						)}
					>
						<FileText
							class={cn('h-4 w-4', activeTool === 'logger' ? 'text-blue-600' : 'text-gray-400')}
						/>
						Local Logger
						{#if activeTool === 'logger'}
							<span
								class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
								>ACTIVE</span
							>
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- <div class="title">Local Launchpad</div> -->

		<!-- Right: Model Select & Settings -->
		<div class="flex items-center gap-4">
			<!-- Model Selector -->
			<div class="flex items-center gap-2">
				<label class="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
					Active Model:
				</label>
				<div
					class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"
				>
					<Cpu class="h-4 w-4 text-gray-500" />
					<select
						bind:value={selectedModel}
						class="max-w-50 min-w-35 cursor-pointer border-none bg-transparent text-sm font-medium text-gray-700 outline-none focus:ring-0"
					>
						<option value="" disabled>Select Model</option>
						{#each models as m}
							<option value={m.name}>
								{m.name}
								{#if m.name === defaultModel}★{/if}
							</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Set Default Button -->
			<div class="flex gap-1">
				<button
					onclick={handleSetDefault}
					disabled={!selectedModel || selectedModel === defaultModel}
					class={cn(
						'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200',
						selectedModel && selectedModel === defaultModel
							? 'cursor-default border border-blue-200 bg-blue-50 text-blue-700'
							: 'border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50'
					)}
					title={selectedModel === defaultModel
						? 'This is your default model'
						: 'Set as default model'}
				>
					<Star
						class={cn(
							'h-4 w-4 transition-all duration-200',
							selectedModel === defaultModel && 'fill-blue-600 text-blue-600'
						)}
					/>
					{#if selectedModel === defaultModel}
						<span>Default</span>
					{:else}
						<span>Set Default</span>
					{/if}
				</button>
			</div>

			<div class="mx-1 h-10 w-px bg-gray-200"></div>

			<Settings onConfigChange={() => window.location.reload()} />
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="relative flex-1 overflow-hidden">
		{#if activeTool === 'repo'}
			<div class="flex h-full w-full">
				<RepoExplorer
					onSelectionChange={handleSelectionChange}
					onUrlChange={(url) => (currentRepoUrl = url)}
					onFileClick={(file) => (activeFile = file)}
					onBranchCompare={(data, branches) => {
						branchComparison = data;
						selectedBranchNames = branches || [];
					}}
					selectedFiles={new Set(selectedFiles.map((f) => f.path))}
					activeTab={activeExplorerTab}
					onTabChange={handleTabChange}
					onPRSelect={(pr) => (selectedPR = pr)}
					{selectedPR}
				/>

				<div class="h-full flex-1">
					<Chat
						{selectedFiles}
						repoUrl={currentRepoUrl}
						{activeFile}
						{branchComparison}
						{selectedBranchNames}
						{selectedPR}
						{selectedModel}
						{activeExplorerTab}
					/>
				</div>
			</div>
		{:else if activeTool === 'batch'}
			<BatchRefactor {selectedModel} />
		{:else if activeTool === 'security'}
			<SecurityScan {selectedModel} />
		{:else if activeTool === 'logs'}
			<LogDetective {selectedModel} repoUrl={currentRepoUrl} />
		{:else if activeTool === 'logger'}
			<LocalLogger />
		{/if}
	</div>
</div>

<style>
	.title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e3a5f;
		margin: 0;
		letter-spacing: -0.02em;
		background: linear-gradient(135deg, #4565cf 0%, #3b82f6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-family: 'Source Serif 4', Georgia, serif;
	}
</style>
