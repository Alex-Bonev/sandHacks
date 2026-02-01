<script lang="ts">
	import { marked } from 'marked';
	import {
		Send,
		Bot,
		User,
		Loader2,
		MessageSquare,
		FileText,
		Sparkles,
		ShieldAlert,
		Zap,
		BookOpen,
		GripHorizontal,
		GitMerge,
		Scale,
		Square,
		Brain
	} from 'lucide-svelte';
	import PRPreview from './PRPreview.svelte';
	import { getModels, streamChat, type ChatMessage, type OllamaModel } from '../lib/ollama';
	import {
		fetchFileContent,
		parseRepoUrl,
		fetchPullRequestFiles,
		type BranchComparison,
		type GitHubFile,
		type PullRequest
	} from '../lib/github';
	import { getSetting } from '../lib/storage';
	import { onMount, tick } from 'svelte';
	import CodePreview from './CodePreview.svelte';
	import BranchDetails from './BranchDetails.svelte';
	import { cn } from '../utils/cn';
	import { store as vectorStore } from '../lib/rag';

	let {
		selectedFiles,
		repoUrl,
		activeFile,
		branchComparison,
		selectedPR,
		activeExplorerTab,
		selectedModel,
		// Add the new prop here
		selectedBranchNames = []
	} = $props<{
		selectedFiles: GitHubFile[];
		repoUrl: string;
		activeFile: GitHubFile | null;
		branchComparison: BranchComparison | null;
		selectedPR: PullRequest | null;
		selectedModel: any;
		activeExplorerTab: 'files' | 'prs' | 'branches';
		selectedBranchNames?: string[];
	}>();

	let activeTab = $state<'chat' | 'preview'>('chat');

	// Chat State
	let messages = $state<ChatMessage[]>([]);
	let input = $state('');

	let loading = $state(false);
	let streaming = $state(false);
	let ollamaUrl = $state('http://localhost:11434');
	let messagesContainer: HTMLDivElement | undefined = $state();
	let abortController: AbortController | null = null;

	let useSmartContext = $state(true); // Default ON

	const scrollToBottom = async () => {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	};

	const handlePreset = async (action: 'summarize' | 'review' | 'impact' | 'improve') => {
		let text = '';
		switch (action) {
			case 'summarize':
				text =
					'Please summarize the changes in this Pull Request. Focus on the high-level purpose and key modifications.';
				break;
			case 'review':
				text =
					'Review this Pull Request for any potential bugs, security vulnerabilities, or code quality issues. Be critical but constructive.';
				break;
			case 'impact':
				text =
					'Analyze the potential impact of these changes. What parts of the system might be affected? Are there backward compatibility concerns?';
				break;
			case 'improve':
				text =
					'Suggest 3 concrete ways to improve this code (performance, readability, or maintainability) based on the changes shown.';
				break;
		}

		input = text;
		await tick();
		handleSend();
	};

	// 1. Dynamic System Prompt Generator
	const getSystemPrompt = () => {
		const basePrompt = 'You are an expert software engineer assistant running locally.';

		if (activeExplorerTab === 'branches') {
			return `${basePrompt}
      You are acting as a Git Release Manager and Conflict Analyst.
      Your goal is to analyze the divergence between two branches and recommend the safest merge strategy.
      - Explain the git commands needed to merge (squashing, rebasing)`;
		}

		if (activeExplorerTab === 'prs') {
			return `${basePrompt}
      You are acting as a Senior Code Reviewer.
      Your goal is to find bugs, security vulnerabilities, and code style issues in the provided Pull Request.
      - Be constructive but critical.
      - Prioritize security and performance issues.
      - Reference specific file names in your feedback.`;
		}

		return `${basePrompt}
    You are acting as a Pair Programmer.
    Analyze the provided code context from the selected files.
    - Always provide clear, correct, and secure code.
    - When modifying code, show enough context to locate the change.`;
	};

	// 2. Enhanced Context Builder
	const buildContext = async () => {
		let context = '';

		if (useSmartContext && vectorStore.count > 0 && input.trim()) {
			try {
				const results = await vectorStore.search(input, 3);
				if (results.length > 0) {
					context += `\n\n=== 🧠 SMART CONTEXT (RAG) ===\n`;
					context += `The following files were automatically found to be relevant to the user's request:\n`;
					results.forEach((doc) => {
						// Don't duplicate if already manually selected
						const isSelected = selectedFiles.some((f) => f.path === doc.path);
						if (!isSelected) {
							context += `\n--- File: ${doc.path} ---\n${doc.content.slice(0, 2000)}\n`; // Truncate
						}
					});
					context += `\n=== END SMART CONTEXT ===\n`;
				}
			} catch (e) {
				console.warn('RAG Search failed', e);
			}
		}

		// --- Branch Mode ---
		if (activeExplorerTab === 'branches' && branchComparison) {
			const base = selectedBranchNames?.[0] || 'Base';
			const head = selectedBranchNames?.[1] || 'Head';

			context += `\n\n=== BRANCH COMPARISON CONTEXT ===\n`;
			context += `Comparing '${head}' (Head) into '${base}' (Base).\n`;
			context += `Status: ${branchComparison.status}\n`;
			context += `Stats: ${branchComparison.ahead_by} commits ahead, ${branchComparison.behind_by} commits behind.\n`;

			context += `\n-- Recent Commits --\n`;
			if (branchComparison.commits) {
				branchComparison.commits.slice(0, 15).forEach((c) => {
					context += `[${c.commit.author.date.substring(0, 10)}] ${c.commit.author.name}: ${c.commit.message.split('\n')[0]}\n`;
				});
			}

			context += `\n-- Changed Files & Diffs --\n`;
			branchComparison.files.slice(0, 20).forEach((f) => {
				context += `\nFile: ${f.filename} (${f.status.toUpperCase()}) | +${f.additions} / -${f.deletions}\n`;

				// ADDED: Include the patch (diff) if available
				if (f.patch) {
					// Truncate to ~100 lines to avoid blowing up context
					const patchLines = f.patch.split('\n');
					const truncatedPatch =
						patchLines.length > 100
							? patchLines.slice(0, 100).join('\n') +
								`\n... (diff truncated, ${patchLines.length - 100} lines hidden)`
							: f.patch;

					context += `Diff:\n${truncatedPatch}\n`;
				} else {
					context += `(No text diff available)\n`;
				}
			});

			if (branchComparison.files.length > 20) {
				context += `\n... and ${branchComparison.files.length - 20} more files changed.\n`;
			}

			return context;
		}

		// --- PR Mode ---
		if (activeExplorerTab === 'prs' && selectedPR) {
			const token = await getSetting('github_token');
			const repoInfo = parseRepoUrl(repoUrl);

			context += `\n\n=== PULL REQUEST CONTEXT ===\n`;
			context += `Title: ${selectedPR.title}\n`;
			context += `Author: ${selectedPR.user.login}\n`;
			context += `Description:\n${selectedPR.body || '(No description provided)'}\n`;

			if (repoInfo) {
				const files = await fetchPullRequestFiles(
					repoInfo.owner,
					repoInfo.repo,
					selectedPR.number,
					token || undefined
				);

				context += `\n-- Files Changed --\n`;
				files.forEach((f) => {
					context += `\nFile: ${f.filename} (${f.status})\n`;
					// Include diffs for PRs to allow actual code review
					if (f.patch) {
						// Truncate very large diffs to save context window
						const diff =
							f.patch.length > 3000 ? f.patch.slice(0, 3000) + '\n...(truncated)...' : f.patch;
						context += `Diff:\n${diff}\n`;
					}
				});
			}
			return context;
		}

		// --- Files Mode (Default) ---
		if (selectedFiles.length > 0) {
			const token = await getSetting('github_token');
			const repoInfo = parseRepoUrl(repoUrl);
			if (!repoInfo) return '';

			context += '\n\n=== SELECTED FILES CONTEXT ===\n';

			const promises = selectedFiles.map(async (file) => {
				try {
					const content = await fetchFileContent(
						repoInfo.owner,
						repoInfo.repo,
						file.path,
						token || undefined
					);
					return `\n--- File: ${file.path} ---\n${content}\n`;
				} catch (e) {
					return `\n--- File: ${file.path} (Error fetching content) ---\n`;
				}
			});

			const results = await Promise.all(promises);
			context += results.join('');
			return context;
		}

		return context;
	};

	const handleSend = async () => {
		if (!input.trim() || !selectedModel) return;

		if (abortController) abortController.abort();
		abortController = new AbortController();

		const userMessage: ChatMessage = { role: 'user', content: input };
		messages = [...messages, userMessage];
		const currentInput = input;
		input = '';
		loading = true;
		scrollToBottom();

		try {
			const context = await buildContext();

			const systemMessage: ChatMessage = {
				role: 'system',
				content: getSystemPrompt() // Use dynamic prompt
			};

			const finalMessages = [
				systemMessage,
				...messages,
				{ role: 'user', content: currentInput + context }
			];

			loading = false;
			streaming = true;
			console.log('streaming');
			console.log(streaming);

			let assistantMessage = '';
			messages = [...messages, { role: 'assistant', content: '' }];

			await streamChat(
				ollamaUrl,
				selectedModel,
				finalMessages as ChatMessage[],
				(chunk) => {
					assistantMessage += chunk;
					const newMsg = [...messages];
					newMsg[newMsg.length - 1] = { role: 'assistant', content: assistantMessage };
					messages = newMsg;
					scrollToBottom();
				},
				abortController.signal
			);
		} catch (e: any) {
			if (e.name !== 'AbortError') {
				console.error(e);
				messages = [
					...messages,
					{ role: 'assistant', content: 'Error: Could not connect to Ollama or process request.' }
				];
			}
		} finally {
			loading = false;
			streaming = false;
			abortController = null;
			scrollToBottom();
		}
	};

	const handleStop = () => {
		if (abortController) {
			abortController.abort();
			abortController = null;
			streaming = false;
			loading = false;
		}
	};

	// --- Resizing Logic (Horizontal Split) ---
	let isDragging = $state(false);
	let topHeightPercentage = $state(50);
	let containerRef: HTMLDivElement | undefined = $state();

	const startDrag = (e: MouseEvent) => {
		isDragging = true;
		window.addEventListener('mousemove', handleDrag);
		window.addEventListener('mouseup', stopDrag);
		document.body.style.userSelect = 'none';
	};

	const handleDrag = (e: MouseEvent) => {
		if (!isDragging || !containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const offsetY = e.clientY - rect.top;
		let newPercentage = (offsetY / rect.height) * 100;
		newPercentage = Math.max(20, Math.min(80, newPercentage));
		topHeightPercentage = newPercentage;
	};

	// --- Resizing Logic (Vertical Split for Branches) ---
	let leftWidthPercentage = $state(50);
	let isDraggingVertical = $state(false);

	// Added Missing Function
	const startDragVertical = (e: MouseEvent) => {
		isDraggingVertical = true;
		window.addEventListener('mousemove', handleDragVertical);
		window.addEventListener('mouseup', stopDrag); // Reuse generic stop
		document.body.style.userSelect = 'none';
	};

	// Added Missing Function
	const handleDragVertical = (e: MouseEvent) => {
		if (!isDraggingVertical || !containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		let newPercentage = (offsetX / rect.width) * 100;
		newPercentage = Math.max(20, Math.min(80, newPercentage));
		leftWidthPercentage = newPercentage;
	};

	const stopDrag = () => {
		isDragging = false;
		isDraggingVertical = false; // Ensure both are stopped
		window.removeEventListener('mousemove', handleDrag);
		window.removeEventListener('mousemove', handleDragVertical); // Remove both listeners
		window.removeEventListener('mouseup', stopDrag);
		document.body.style.userSelect = '';
	};

	// Handle preset for Branches
	const handleBranchPreset = async (action: 'merge' | 'conflict') => {
		let text = '';
		if (action === 'merge') {
			text =
				'What is the best strategy to merge these branches? Should I merge, rebase, or squash? Explain the pros and cons based on the divergence.';
		} else {
			text =
				'Analyze potential conflicts between these branches. Based on the file stats (ahead/behind), how risky is this merge?';
		}
		input = text;
		await tick();
		handleSend();
	};
</script>

<div class="relative flex h-full flex-col bg-white">
	{#if activeExplorerTab === 'branches'}
		<!-- Branch Split View (Left/Right) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={containerRef}
			class="relative flex h-full flex-row overflow-hidden"
			onmouseup={stopDrag}
			onmouseleave={stopDrag}
		>
			<!-- Left Panel: Details Table -->
			<div
				style="width: {leftWidthPercentage}%"
				class="h-full overflow-hidden border-r border-gray-200"
			>
				<BranchDetails
					comparison={branchComparison}
					baseBranch={selectedBranchNames?.[0] || 'Base'}
					headBranch={selectedBranchNames?.[1] || 'Head'}
				/>
			</div>

			<!-- Draggable Handle (Vertical) -->
			<div
				class="group z-20 grid w-1 cursor-col-resize place-items-center justify-center border-r border-gray-200 bg-gray-100 transition-colors hover:bg-blue-400"
				onmousedown={startDragVertical}
			>
				<div class="mx-auto h-8 w-1 rounded-full bg-gray-300 group-hover:bg-white"></div>
			</div>

			<!-- Right Panel: Chat -->
			<div style="width: {100 - leftWidthPercentage}%" class="flex min-w-0 flex-col bg-white">
				<div
					bind:this={messagesContainer}
					class="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 pb-2"
				>
					<!-- Empty State for Branch Chat -->
					{#if messages.length === 0}
						<div
							class="flex h-full flex-col items-center justify-center gap-2 text-gray-400 opacity-60"
						>
							<GitMerge class="h-10 w-10" />
							<p class="text-sm">Select branches to analyze.</p>
						</div>
					{/if}

					{#each messages as msg}
						<div class={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
							<div
								class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
									msg.role === 'user' ? 'bg-gray-800' : 'bg-blue-600'
								}`}
							>
								{#if msg.role === 'user'}
									<User class="h-4 w-4 text-white" />
								{:else}
									<Bot class="h-4 w-4 text-white" />
								{/if}
							</div>

							<div
								class={`max-w-[90%] flex-1 rounded-2xl px-5 py-3 text-sm shadow-sm ${
									msg.role === 'user'
										? 'rounded-tr-sm bg-white text-gray-800'
										: 'rounded-tl-sm bg-white text-gray-800 ring-1 ring-black/5'
								}`}
							>
								{#if msg.role === 'user'}
									<p class="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
								{:else}
									<div
										class="prose prose-sm max-w-none prose-blue prose-p:leading-relaxed prose-pre:border prose-pre:border-gray-100 prose-pre:bg-gray-50"
									>
										{@html marked.parse(msg.content)}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Input & Presets -->
				<div class="border-t border-gray-200 bg-white">
					<div
						class="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-3 py-2"
					>
						<button
							onclick={() => handleBranchPreset('merge')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-medium text-blue-700 shadow-sm transition-all hover:bg-blue-50"
						>
							<GitMerge class="h-3 w-3" /> Merge Strategy
						</button>
						<button
							onclick={() => handleBranchPreset('conflict')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-medium text-orange-700 shadow-sm transition-all hover:bg-orange-50"
						>
							<Scale class="h-3 w-3" /> Risk Analysis
						</button>
					</div>

					<div class="p-3">
						<div class="relative mx-auto max-w-4xl">
							<textarea
								bind:value={input}
								onkeydown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
								placeholder="Ask about these branches..."
								class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-3 pr-12 pl-4 text-sm shadow-sm transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500"
								rows={1}
								style="min-height: 48px; max-height: 150px;"
							></textarea>

							<button
								onclick={streaming ? handleStop : handleSend}
								disabled={(!input.trim() && !streaming) || loading || !selectedModel}
								class="absolute top-2 right-2 rounded-lg bg-blue-600 p-2 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
							>
								{#if streaming}
									<!-- Stop Icon (Square) -->
									<div class="h-4 w-4 scale-75 rounded-sm bg-white"></div>
									<!-- Or import { Square } form lucide-svelte and use <Square class="w-4 h-4 fill-current" /> -->
								{:else if loading}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else}
									<Send class="h-4 w-4" />
								{/if}
							</button>
						</div>

						<p class="mt-2 text-center text-[10px] font-medium text-gray-400">
							Running locally via Ollama • {selectedModel || 'No model selected'}
						</p>
					</div>
				</div>
			</div>
		</div>
	{:else if activeExplorerTab === 'prs' && selectedPR}
		<!-- Split View Mode -->
		<div bind:this={containerRef} class="relative flex h-full flex-col overflow-hidden">
			<!-- Top Pane (PR Preview) -->
			<div style="height: {topHeightPercentage}%" class="overflow-hidden shadow-xl">
				<PRPreview pr={selectedPR} {repoUrl} />
			</div>

			<!-- Draggable Handle -->
			<button
				class="z-1000 flex h-px cursor-row-resize items-center justify-center bg-stone-300 shadow-xl transition-colors hover:bg-stone-400"
				onmousedown={startDrag}
			>
				<GripHorizontal
					class="transition-color z-1000 h-4 w-12 rounded-md border-2 border-stone-600 bg-white text-gray-600 duration-300 ease-in-out hover:bg-stone-200 active:bg-stone-400"
				/>
			</button>

			<!-- Chat Area (Bottom Half of Split View) -->
			<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
				<!-- Empty State / Preset Buttons -->
				{#if messages.length === 0}
					<div class="animate-fade-in mx-auto grid max-w-lg grid-cols-2 gap-2 p-4">
						<button
							onclick={() => handlePreset('summarize')}
							class="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-medium text-blue-700 shadow-sm transition-all hover:bg-blue-50"
						>
							<Sparkles class="h-3.5 w-3.5" /> Summarize
						</button>

						<button
							onclick={() => handlePreset('review')}
							class="flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2.5 text-xs font-medium text-purple-700 shadow-sm transition-all hover:bg-purple-50"
						>
							<ShieldAlert class="h-3.5 w-3.5" /> Security Review
						</button>

						<button
							onclick={() => handlePreset('impact')}
							class="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-xs font-medium text-orange-700 shadow-sm transition-all hover:bg-orange-50"
						>
							<BookOpen class="h-3.5 w-3.5" /> Explain Impact
						</button>

						<button
							onclick={() => handlePreset('improve')}
							class="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2.5 text-xs font-medium text-green-700 shadow-sm transition-all hover:bg-green-50"
						>
							<Zap class="h-3.5 w-3.5" /> Suggest Improvements
						</button>
					</div>
				{/if}

				<!-- Messages List -->
				{#each messages as msg}
					<div class={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
						<!-- Avatar -->
						<div
							class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
								msg.role === 'user' ? 'bg-gray-800' : 'bg-blue-600'
							}`}
						>
							{#if msg.role === 'user'}
								<User class="h-4 w-4 text-white" />
							{:else}
								<Bot class="h-4 w-4 text-white" />
							{/if}
						</div>

						<!-- Message Bubble -->
						<div
							class={`max-w-[90%] flex-1 rounded-2xl px-5 py-3 text-sm shadow-sm ${
								msg.role === 'user'
									? 'rounded-tr-sm bg-white text-gray-800'
									: 'rounded-tl-sm bg-white text-gray-800 ring-1 ring-black/5'
							}`}
						>
							{#if msg.role === 'user'}
								<p class="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
							{:else}
								<div
									class="prose prose-sm max-w-none prose-blue prose-p:leading-relaxed prose-pre:border prose-pre:border-gray-100 prose-pre:bg-gray-50"
								>
									{@html marked.parse(msg.content)}
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Loading / Streaming Indicator -->
				{#if loading}
					<div class="flex gap-3">
						<div
							class="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-blue-600 shadow-sm"
						>
							<Bot class="h-4 w-4 text-white" />
						</div>
						<div
							class="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-5 py-3 text-sm text-gray-500 shadow-sm"
						>
							<Loader2 class="h-4 w-4 animate-spin" />
							<span class="animate-pulse">Analyzing changes...</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Input Area Wrapper -->
			<div class="border-t border-gray-200 bg-white">
				<!-- Persistent Preset Chips -->
				{#if messages.length > 0}
					<div
						class="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-3 py-2"
					>
						<div class="text-sm">Preset Questions:</div>

						<button
							onclick={() => handlePreset('summarize')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-blue-700 shadow-sm transition-all hover:bg-blue-50"
						>
							<Sparkles class="h-3 w-3" /> Summarize
						</button>

						<button
							onclick={() => handlePreset('review')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-purple-200 bg-white px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-purple-700 shadow-sm transition-all hover:bg-purple-50"
						>
							<ShieldAlert class="h-3 w-3" /> Security
						</button>

						<button
							onclick={() => handlePreset('impact')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-orange-700 shadow-sm transition-all hover:bg-orange-50"
						>
							<BookOpen class="h-3 w-3" /> Impact
						</button>

						<button
							onclick={() => handlePreset('improve')}
							class="flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-white px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-green-700 shadow-sm transition-all hover:bg-green-50"
						>
							<Zap class="h-3 w-3" /> Improve
						</button>
					</div>
				{/if}

				<!-- Text Input -->
				<div class="border-t border-gray-200 bg-white p-3">
					<div class="relative mx-auto max-w-4xl">
						<textarea
							bind:value={input}
							onkeydown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							placeholder="Ask about this Pull Request..."
							class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-3 pr-12 pl-4 text-sm shadow-sm transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500"
							rows={1}
							style="min-height: 48px; max-height: 150px;"
						></textarea>

						<button
							onclick={streaming ? handleStop : handleSend}
							disabled={(!input.trim() && !streaming) || loading || !selectedModel}
							class="absolute top-2 right-2 rounded-lg bg-blue-600 p-2 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
						>
							{#if streaming}
								<!-- Stop Icon (Square) -->
								<div class="h-4 w-4 scale-75 rounded-sm bg-white"></div>
							{:else if loading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<Send class="h-4 w-4" />
							{/if}
						</button>
					</div>

					<p class="mt-2 text-center text-[10px] font-medium text-gray-400">
						Running locally via Ollama • {selectedModel || 'No model selected'}
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Header -->
		<div
			class="z-10 flex items-center justify-between border-b border-gray-200 bg-white p-3 shadow-sm"
		>
			<div class="flex gap-4">
				<!-- Mode Toggle -->
				<div class="flex rounded-lg bg-gray-100 p-1">
					<button
						onclick={() => (activeTab = 'chat')}
						class={cn(
							'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
							activeTab === 'chat'
								? 'bg-white text-blue-600 shadow-sm'
								: 'text-gray-500 hover:text-gray-700'
						)}
					>
						<MessageSquare class="h-4 w-4" />
						Chat
					</button>
					<button
						onclick={() => (activeTab = 'preview')}
						class={cn(
							'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
							activeTab === 'preview'
								? 'bg-white text-blue-600 shadow-sm'
								: 'text-gray-500 hover:text-gray-700'
						)}
					>
						<FileText class="h-4 w-4" />
						Preview
					</button>
				</div>
				{#if activeTab == 'preview'}
					<div class="flex items-center text-sm">
						<div>Currently viewing:</div>
						{#if activeFile && activeFile.path}
							<span class="mt-0.5 ml-2 flex items-center font-mono text-xs text-blue-500">
								{activeFile.path}
							</span>
						{:else}
							<span class="ml-2 text-stone-400"> No file selected </span>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-3 pr-12">
				<!-- <button
					onclick={() => (useSmartContext = !useSmartContext)}
					class={cn(
						'flex items-center gap-1.5 rounded-full border p-1.5 px-3 text-xs font-medium transition-colors',
						useSmartContext
							? 'border-indigo-200 bg-indigo-50 text-indigo-700'
							: 'border-gray-200 bg-gray-50 text-gray-500'
					)}
					title="Toggle Smart Context (RAG)"
				>
					<Brain class="h-3.5 w-3.5" />
					{useSmartContext ? 'Smart Ctx On' : 'Smart Ctx Off'}
				</button> -->
			</div>
		</div>

		{#if activeTab === 'chat'}
			<!-- Messages -->
			<div bind:this={messagesContainer} class="flex-1 space-y-6 overflow-y-auto bg-gray-50 p-4">
				{#if messages.length === 0}
					<div class="flex h-full flex-col items-center justify-center text-gray-400">
						<MessageSquare class="mb-3 h-12 w-12 opacity-20" />
						<p class="text-sm">Select a file and send a message to get started!</p>
					</div>
				{/if}

				{#each messages as msg}
					<div class={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
						<div
							class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
								msg.role === 'user' ? 'bg-gray-800' : 'bg-blue-600'
							}`}
						>
							{#if msg.role === 'user'}
								<User class="h-5 w-5 text-white" />
							{:else}
								<Bot class="h-5 w-5 text-white" />
							{/if}
						</div>

						<div
							class={`max-w-3xl flex-1 rounded-2xl px-6 py-4 shadow-sm ${
								msg.role === 'user'
									? 'rounded-tr-sm bg-white text-gray-800'
									: 'rounded-tl-sm bg-white text-gray-800 ring-1 ring-black/5'
							}`}
						>
							{#if msg.role === 'user'}
								<p class="whitespace-pre-wrap">{msg.content}</p>
							{:else}
								<div class="prose prose-sm max-w-none prose-blue">
									{@html marked.parse(msg.content)}
								</div>
							{/if}
						</div>
					</div>
				{/each}

				{#if loading}
					<div class="flex gap-4">
						<div
							class="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-blue-600"
						>
							<Bot class="h-5 w-5 text-white" />
						</div>
						<div
							class="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-6 py-4 text-sm text-gray-500 shadow-sm"
						>
							<Loader2 class="h-4 w-4 animate-spin" />
							Fetching context & thinking...
						</div>
					</div>
				{/if}
			</div>

			<!-- Input -->
			<div class="border-t border-gray-200 bg-white p-4">
				<div class="relative mx-auto max-w-4xl">
					<textarea
						bind:value={input}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder={selectedFiles.length > 0
							? `Ask about ${selectedFiles.length} selected files...`
							: 'Ask a question...'}
						class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-3 pr-12 pl-4 shadow-sm transition-all outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
						rows={1}
						style="min-height: 50px; max-height: 200px;"
					></textarea>
					<button
						onclick={streaming ? handleStop : handleSend}
						disabled={(!input.trim() && !streaming) || loading || !selectedModel}
						class="absolute top-2 right-2 rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
					>
						{#if streaming}
							<!-- Stop Icon (Square) -->
							<div class="h-4 w-4 scale-75 rounded-sm bg-white"></div>
							<!-- Or import { Square } form lucide-svelte and use <Square class="w-4 h-4 fill-current" /> -->
						{:else if loading}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Send class="h-4 w-4" />
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<!-- Preview Tab -->
			<CodePreview file={activeFile} {repoUrl} />
		{/if}
	{/if}
</div>
