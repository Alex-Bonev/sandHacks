<script>
	import { onMount } from 'svelte';

	let mounted = $state(false);
	let copiedIndex = $state(-1);

	const ollamaSteps = [
		{
			title: 'Install Ollama',
			description: 'Ollama allows you to run large language models locally on your machine.',
			link: 'https://ollama.com/download',
			linkText: 'Download Ollama',
			commands: null
		},
		{
			title: 'Pull a Model',
			description:
				'Download a language model. I recommend starting with Gemma 3 for a good balance of speed and capability.',
			commands: ['ollama pull gemma3:1b']
		},
		{
			title: 'Start Server',
			description:
				'Run the Ollama server in the background. It must be running for the app to connect.',
			commands: ['ollama serve']
		}
	];

    const appSteps = [
        {
            title: 'Clone Repository',
            description: 'Download the source code to your machine.',
            commands: ['git clone https://github.com/Alex-Bonev/sandHacks.git', 'cd local-launchpad']
        },
        {
            title: 'Install Dependencies',
            description: 'Install the required node packages.',
            commands: ['npm install']
        },
        {
            title: 'Run Locally',
            description: 'Start the development server. This is the best way to use the app.',
            commands: ['npm run dev']
        }
    ];

    const tunnelSteps = [
        {
            title: 'Install Ngrok',
            description: 'If you want to use the Vercel deployment, you must tunnel your local Ollama port to the internet.',
            link: 'https://ngrok.com/download',
            linkText: 'Download Ngrok',
            commands: null
        },
        {
            title: 'Expose Port 11434',
            description: 'Create a secure tunnel to your local Ollama instance.',
            commands: ['ngrok http 11434']
        },
        {
            title: 'Configure App',
            description: 'Copy the "Forwarding" URL from Ngrok (e.g., https://xyz.ngrok-free.app) and paste it into the "Settings" menu of Local Launchpad.',
            commands: null
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
			<p class="subtitle">Complete configuration guide for Local Launchpad</p>
		</div>

        <!-- Section 1: Ollama -->
        <div class="section-header">
            <div class="section-badge">1</div>
            <h2>Setup Ollama (Required)</h2>
        </div>
		<div class="steps-container">
			{#each ollamaSteps as step, i}
				<div class="step-card" style="animation-delay: {0.1 + i * 0.1}s">
					<div class="step-number">{i + 1}</div>
					<div class="step-content">
						<h2 class="step-title">{step.title}</h2>
						<p class="step-description">{step.description}</p>
						{#if step.link}
							<a href={step.link} target="_blank" rel="noopener noreferrer" class="download-link">
								{step.linkText} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
							</a>
						{/if}
						{#if step.commands}
							<div class="commands-container">
								{#each step.commands as command, j}
									<div class="command-block">
										<code class="command-text">{command}</code>
										<button class="copy-button" onclick={() => copyToClipboard(command, `ollama-${i}-${j}`)}>
                                            {#if copiedIndex === `ollama-${i}-${j}`}
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg>
                                            {:else}
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
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

        <!-- Section 2: Method Selection -->
        <div class="method-split">
            <div class="section-header">
                <div class="section-badge">2</div>
                <h2>Choose How to Run</h2>
            </div>
            
            <div class="tabs">
                <div class="tab-card recommended">
                    <div class="tab-header">
                        <h3>Option A: Run Locally</h3>
                        <span class="badge">Recommended</span>
                    </div>
                    <p>Run the web app on your own machine. Best performance and privacy.</p>
                    <div class="mini-steps">
                        {#each appSteps as step, i}
                            <div class="mini-step">
                                <div class="step-dot"></div>
                                <div class="mini-content">
                                    <strong>{step.title}</strong>
                                    {#if step.commands}
                                        <code class="mini-code">{step.commands[0]}</code>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <div class="tab-card advanced">
                    <div class="tab-header">
                        <h3>Option B: Use Vercel</h3>
                        <span class="badge orange">Advanced</span>
                    </div>
                    <p>Use the hosted website but connect to your local Ollama via a Tunnel.</p>
                    <div class="mini-steps">
                        {#each tunnelSteps as step, i}
                            <div class="mini-step">
                                <div class="step-dot orange"></div>
                                <div class="mini-content">
                                    <strong>{step.title}</strong>
									{#if step.description}
										<div class="text-xs text-stone-600">{step.description}</div>
									{/if}
                                    {#if step.commands}
                                        <code class="mini-code">{step.commands[0]}</code>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>

		<div class="success-section">
			<div class="success-icon">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
			</div>
			<h2 class="success-title">Ready to Launch?</h2>
			<p class="success-description">
				Once your environment is set up, verify your settings in the app.
			</p>
			<a href="/tools" class="cta-button">
				Go to Dashboard
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
			</a>
		</div>
	</main>
</div>

<style>
	/* ... (Keep existing styles) ... */
    /* Additions below */

    .section-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .section-badge {
        width: 32px;
        height: 32px;
        background: #1e293b;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-family: sans-serif;
    }

    .section-header h2 {
        font-size: 1.5rem;
        color: #1e3a5f;
        margin: 0;
        font-family: 'Source Serif 4', serif;
    }

    .method-split {
        margin-bottom: 3rem;
    }

    .tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .tab-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.5rem;
        transition: all 0.2s;
    }

    .tab-card.recommended {
        border-color: #bfdbfe;
        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
    }

    .tab-card.advanced {
        border-color: #fdba74;
    }

    .tab-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .tab-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #0f172a;
    }

    .badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 999px;
        font-weight: 600;
        font-family: sans-serif;
    }

    .badge.orange {
        background: #ffedd5;
        color: #9a3412;
    }

    .mini-steps {
        margin-top: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .mini-step {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
    }

    .step-dot {
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border-radius: 50%;
        margin-top: 6px;
    }

    .step-dot.orange {
        background: #f97316;
    }

    .mini-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.9rem;
    }

    .mini-code {
        background: #f1f5f9;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.8rem;
        color: #475569;
        width: fit-content;
    }

    @media (max-width: 768px) {
        .tabs {
            grid-template-columns: 1fr;
        }
    }
    
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