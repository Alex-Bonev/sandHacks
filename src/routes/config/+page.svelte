<script>
	import { onMount } from 'svelte';

	let mounted = $state(false);
	let copiedIndex = $state(-1);

	const steps = [
		{
			title: 'Install Ollama',
			description: 'Ollama allows you to run large language models locally on your machine.',
			link: 'https://ollama.com/download',
			linkText: 'Download Ollama',
			commands: null
		},
		{
			title: 'Verify Installation',
			description: 'Open your terminal and verify that Ollama is installed correctly.',
			commands: ['ollama --version']
		},
		{
			title: 'Pull a Model',
			description:
				'Download a language model. I recommend starting with Gemma 3 for a good balance of speed and capability.',
			commands: ['ollama pull gemma3:1b']
		},
		{
			title: 'Start the Ollama Server',
			description:
				'Run the Ollama server in the background. This needs to be running for Local Launchpad to work.',
			commands: ['ollama serve']
		},
		{
			title: 'Test the Connection',
			description:
				'In a new terminal window, verify the server is running by listing available models.',
			commands: ['ollama list']
		}
	];

	onMount(() => {
		mounted = true;
	});

	async function copyToClipboard(text, index) {
		try {
			await navigator.clipboard.writeText(text);
			copiedIndex = index;
			setTimeout(() => {
				copiedIndex = -1;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="config-container">
	<header class="header">
		<a href="/" class="back-link">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="m12 19-7-7 7-7" />
				<path d="M19 12H5" />
			</svg>
			Back to Home
		</a>
	</header>

	<main class="main-content" class:animate={mounted}>
		<div class="title-section">
			<h1 class="title">Setup Guide</h1>
			<p class="subtitle">Get Local Launchpad running in just a few minutes</p>
		</div>

		<div class="steps-container">
			{#each steps as step, i}
				<div class="step-card" style="animation-delay: {0.1 + i * 0.1}s">
					<div class="step-number">{i + 1}</div>
					<div class="step-content">
						<h2 class="step-title">{step.title}</h2>
						<p class="step-description">{step.description}</p>

						{#if step.link}
							<a href={step.link} target="_blank" rel="noopener noreferrer" class="download-link">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" x2="12" y1="15" y2="3" />
								</svg>
								{step.linkText}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" x2="21" y1="14" y2="3" />
								</svg>
							</a>
						{/if}

						{#if step.commands}
							<div class="commands-container">
								{#each step.commands as command, j}
									{@const commandIndex = i * 10 + j}
									<div class="command-block">
										<code class="command-text">{command}</code>
										<button
											class="copy-button"
											onclick={() => copyToClipboard(command, commandIndex)}
											aria-label="Copy command"
										>
											{#if copiedIndex === commandIndex}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<polyline points="20 6 9 17 4 12" />
												</svg>
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
													<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
												</svg>
											{/if}
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<div class="success-section">
			<div class="success-icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<h2 class="success-title">You're All Set!</h2>
			<p class="success-description">
				Once you see your models listed, you're ready to use Local Launchpad.
			</p>
			<a href="/tools" class="cta-button">
				Start Using Tools
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</a>
		</div>

		<div class="help-section">
			<h3 class="help-title">Need Help?</h3>
			<div class="help-cards">
				<a
					href="https://github.com/ollama/ollama"
					target="_blank"
					rel="noopener noreferrer"
					class="help-card"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
						/>
						<path d="M9 18c-4.51 2-5-2-7-2" />
					</svg>
					<span>Ollama GitHub</span>
				</a>
				<a
					href="https://ollama.com/library"
					target="_blank"
					rel="noopener noreferrer"
					class="help-card"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m16 6 4 14" />
						<path d="M12 6v14" />
						<path d="M8 8v12" />
						<path d="M4 4v16" />
					</svg>
					<span>Model Library</span>
				</a>
				<a
					href="https://discord.gg/ollama"
					target="_blank"
					rel="noopener noreferrer"
					class="help-card"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
						<path d="M12 17h.01" />
					</svg>
					<span>Community Help</span>
				</a>
			</div>
		</div>
	</main>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap');

	:global(body) {
		margin: 0;
		padding: 0;
		background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%);
		min-height: 100vh;
		font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
	}

	.config-container {
		min-height: 100vh;
		padding: 2rem;
		box-sizing: border-box;
	}

	.header {
		max-width: 800px;
		margin: 0 auto 2rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: #2563eb;
	}

	.main-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.main-content.animate .step-card {
		animation: fadeInUp 0.5s ease-out forwards;
		opacity: 0;
	}

	.title-section {
		text-align: center;
		margin-bottom: 3rem;
	}

	.title {
		font-size: 3rem;
		font-weight: 700;
		margin: 0;
		background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.subtitle {
		font-size: 1.25rem;
		color: #64748b;
		margin: 0.75rem 0 0 0;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.steps-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.step-card {
		display: flex;
		gap: 1.5rem;
		background: white;
		border: 1px solid #bfdbfe;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
		transition: all 0.2s ease;
	}

	.step-card:hover {
		box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
		border-color: #93c5fd;
	}

	.step-number {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.1rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.step-content {
		flex: 1;
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e3a5f;
		margin: 0 0 0.5rem 0;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.step-description {
		font-size: 0.95rem;
		color: #64748b;
		margin: 0 0 1rem 0;
		line-height: 1.6;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.download-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		text-decoration: none;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.download-link:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
	}

	.commands-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.command-block {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #1e293b;
		border-radius: 10px;
		padding: 0.75rem 1rem;
		overflow: hidden;
	}

	.command-text {
		font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
		font-size: 0.9rem;
		color: #e2e8f0;
	}

	.copy-button {
		flex-shrink: 0;
		background: transparent;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.copy-button:hover {
		color: #e2e8f0;
	}

	.success-section {
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border: 2px solid #86efac;
		border-radius: 20px;
		margin-bottom: 3rem;
	}

	.success-icon {
		width: 64px;
		height: 64px;
		background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
		color: white;
	}

	.success-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: #166534;
		margin: 0 0 0.5rem 0;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.success-description {
		font-size: 1rem;
		color: #64748b;
		margin: 0 0 1.5rem 0;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 2rem;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		font-size: 1rem;
		font-weight: 600;
		border-radius: 12px;
		text-decoration: none;
		transition: all 0.2s ease;
		box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.cta-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
	}

	.help-section {
		text-align: center;
	}

	.help-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e3a5f;
		margin: 0 0 1.5rem 0;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.help-cards {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.help-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: white;
		border: 1px solid #bfdbfe;
		border-radius: 12px;
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		transition: all 0.2s ease;
	}

	.help-card:hover {
		background: #eff6ff;
		border-color: #93c5fd;
		transform: translateY(-2px);
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.title {
			font-size: 2rem;
		}

		.subtitle {
			font-size: 1rem;
		}

		.step-card {
			flex-direction: column;
			gap: 1rem;
		}

		.step-number {
			width: 36px;
			height: 36px;
			font-size: 1rem;
		}

		.command-text {
			font-size: 0.8rem;
		}

		.help-cards {
			flex-direction: column;
			align-items: center;
		}
	}
</style>
