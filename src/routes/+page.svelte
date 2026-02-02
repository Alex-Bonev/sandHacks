<script>
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';

    let mounted = $state(false);
    let binaryColumns = $state([]);

    onMount(() => {
        // Generate binary rain columns
        const columnCount = Math.floor(window.innerWidth / 24);
        const cols = [];

        for (let i = 0; i < columnCount; i++) {
            const charCount = Math.floor(Math.random() * 15) + 10;
            const chars = [];
            for (let j = 0; j < charCount; j++) {
                chars.push(Math.random() > 0.5 ? '1' : '0');
            }
            cols.push({
                chars,
                left: i * 24 + 12,
                delay: Math.random() * 5,
                duration: Math.random() * 10 + 15
            });
        }
        binaryColumns = cols;

        // Set mounted to true after a small delay to trigger transitions
        setTimeout(() => {
            mounted = true;
        }, 50);
    });
</script>

<div class="landing-container">
    <!-- Binary rain background -->
    <div class="binary-rain">
        {#each binaryColumns as column, i}
            <div
                class="binary-column"
                style="left: {column.left}px; animation-delay: {column.delay}s; animation-duration: {column.duration}s;"
            >
                {#each column.chars as char}
                    <span>{char}</span>
                {/each}
            </div>
        {/each}
    </div>

    <div class="hero-section">
        <svg
            class="lines-svg"
            class:animate={mounted}
            width="100%"
            height="100%"
            viewBox="0 0 900 520"
            preserveAspectRatio="xMidYMid slice"
        >
            <!-- Gradients -->
            <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#60a5fa" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#93c5fd" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#bfdbfe" />
                </linearGradient>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#93c5fd" />
                </linearGradient>
                <linearGradient id="gradient5" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#60a5fa" />
                </linearGradient>
            </defs>

            <!-- Line 1: Far left - vertical then curves far left -->
            <path
                class="animated-line line-1"
                d="M 450 0 
                   L 450 180 
                   C 450 280, 350 350, 112 420"
                fill="none"
                stroke="url(#gradient1)"
                stroke-width="2"
                stroke-linecap="round"
            />

            <!-- Line 2: Left - vertical then curves left -->
            <path
                class="animated-line line-2"
                d="M 450 0 
                   L 450 180 
                   C 450 260, 400 320, 281 420"
                fill="none"
                stroke="url(#gradient2)"
                stroke-width="2"
                stroke-linecap="round"
            />

            <!-- Line 3: Center - straight down -->
            <path
                class="animated-line line-3"
                d="M 450 0 L 450 420"
                fill="none"
                stroke="#60a5fa"
                stroke-width="2"
                stroke-linecap="round"
            />

            <!-- Line 4: Right - vertical then curves right -->
            <path
                class="animated-line line-4"
                d="M 450 0 
                   L 450 180 
                   C 450 260, 500 320, 619 420"
                fill="none"
                stroke="url(#gradient4)"
                stroke-width="2"
                stroke-linecap="round"
            />

            <!-- Line 5: Far right - vertical then curves far right -->
            <path
                class="animated-line line-5"
                d="M 450 0 
                   L 450 180 
                   C 450 280, 550 350, 788 420"
                fill="none"
                stroke="url(#gradient5)"
                stroke-width="2"
                stroke-linecap="round"
            />
        </svg>

        {#if mounted}
            <div class="title-section" transition:fly={{ duration: 1200, y: -20 }}>
                <h1 class="title">Local Launchpad</h1>
                <p class="subtitle">
                    Your AI-powered development companion, running entirely on your machine
                </p>
            </div>
        {/if}

        <div class="features-row" class:animate={mounted}>
            <!-- GitHub Integration -->
            <div class="feature-icon" style="left: 12.5%;">
                <div class="icon-box">
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
                </div>
                <span class="icon-label">Github Analysis</span>
            </div>

            <!-- File Changes -->
            <div class="feature-icon" style="left: 31.25%;">
                <div class="icon-box">
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
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        <path d="M9 15h6" />
                        <path d="M12 18v-6" />
                    </svg>
                </div>
                <span class="icon-label">Infinite Refactoring</span>
            </div>

            <!-- Security -->
            <div class="feature-icon" style="left: 50%;">
                <div class="icon-box">
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
                            d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                        />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                </div>
                <span class="icon-label">Private & Secure</span>
            </div>

            <!-- Bug Detection -->
            <div class="feature-icon" style="left: 68.75%;">
                <div class="icon-box">
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
                        <path d="m8 2 1.88 1.88" />
                        <path d="M14.12 3.88 16 2" />
                        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
                        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
                        <path d="M12 20v-9" />
                        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
                        <path d="M6 13H2" />
                        <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
                        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
                        <path d="M22 13h-4" />
                        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
                    </svg>
                </div>
                <span class="icon-label">Bug Detection</span>
            </div>

            <!-- Logs -->
            <div class="feature-icon" style="left: 87.5%;">
                <div class="icon-box">
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                    </svg>
                </div>
                <span class="icon-label">Activity Logs</span>
            </div>
        </div>
    </div>

    {#if mounted}
        <div class="flex items-center gap-32 -mt-40 z-2" transition:fly={{ duration: 1200, delay: 600, y: 20 }}>
            <a href="/config" class="cta-button px-16 py-4">
                Get Set Up
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
            <a href="/tools" class="secondary-link border-dashed border p-4 rounded-xl px-12">Jump into the tools →</a>
        </div>
    {/if}

    {#if mounted}
        <div transition:fly={{ duration: 800, delay: 2200, y: 10 }} class="absolute bottom-4 text-blue-600/60 w-full text-center text-sm">
            Independently developed by Alexander Bonev for SanD Hacks 2026
        </div>
    {/if}
</div>


<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%);
		min-height: 100vh;
		font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
		overflow-x: hidden;
	}

	/* Binary rain effect */
	.binary-rain {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.binary-column {
		position: absolute;
		top: -100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: fall linear infinite;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		color: #3b82f6;
		opacity: 0.32;
		line-height: 1.4;
	}

	.binary-column span {
		display: block;
	}

	@keyframes fall {
		0% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(calc(200vh + 100%));
		}
	}

	.landing-container {
		position: relative;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		box-sizing: border-box;
		z-index: 1;
	}

	.hero-section {
		position: relative;
		width: 100%;
		max-width: 900px;
		height: 520px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.lines-svg {
		position: absolute;
		top: 10rem;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		overflow: visible;
	}

	.animated-line {
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
		opacity: 0.7;
	}

	line.animated-line {
		stroke-dasharray: 420;
		stroke-dashoffset: 420;
	}

	.lines-svg.animate .line-1 {
		animation: drawLine 2s ease-in-out forwards;
		animation-delay: 0.1s;
	}

	.lines-svg.animate .line-2 {
		animation: drawLine 2s ease-in-out forwards;
		animation-delay: 0.25s;
	}

	.lines-svg.animate .line-3 {
		animation: drawLine 2s ease-in-out forwards;
		animation-delay: 0.4s;
	}

	.lines-svg.animate .line-4 {
		animation: drawLine 2s ease-in-out forwards;
		animation-delay: 0.55s;
	}

	.lines-svg.animate .line-5 {
		animation: drawLine 2s ease-in-out forwards;
		animation-delay: 0.7s;
	}

	@keyframes drawLine {
		to {
			stroke-dashoffset: 0;
		}
	}

	.title-section {
		position: relative;
		z-index: 1;
		text-align: center;
		padding-top: 3rem;
		background: radial-gradient(
			ellipse at center,
			rgba(240, 249, 255, 0.95) 0%,
			rgba(240, 249, 255, 0.8) 50%,
			transparent 70%
		);
		padding: 3rem 2rem 1rem;
		border-radius: 20px;
	}

	.title {
		font-size: 6.5rem;
		font-weight: 700;
		color: #1e3a5f;
		margin: 0;
		letter-spacing: -0.02em;
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
		font-weight: 400;
		font-family: 'Source Serif 4', Georgia, serif;
	}

	.features-row {
		position: absolute;
		top: 36rem;
		left: 0;
		width: 100%;
		height: 100px;
		z-index: 2;
	}

	.feature-icon {
		position: absolute;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		opacity: 0;
	}

	.features-row.animate .feature-icon {
		animation: fadeInUp 0.5s ease-out forwards;
	}

	.features-row.animate .feature-icon:nth-child(1) {
		animation-delay: 1.15s;
	}
	.features-row.animate .feature-icon:nth-child(2) {
		animation-delay: 1.3s;
	}
	.features-row.animate .feature-icon:nth-child(3) {
		animation-delay: 1.45s;
	}
	.features-row.animate .feature-icon:nth-child(4) {
		animation-delay: 1.6s;
	}
	.features-row.animate .feature-icon:nth-child(5) {
		animation-delay: 1.85s;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-10px) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	.icon-box {
		width: 48px;
		height: 48px;
		background: white;
		border: 2px solid #bfdbfe;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #3b82f6;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
		transition: all 0.2s ease;
	}

	.icon-box:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
		border-color: #93c5fd;
	}

	.icon-label {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
		white-space: nowrap;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}


	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
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

	.secondary-link {
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.2s ease;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.secondary-link:hover {
		color: #2563eb;
	}

	@media (max-width: 768px) {
		.title {
			font-size: 2.5rem;
		}

		.subtitle {
			font-size: 1rem;
			padding: 0 1rem;
		}

		.hero-section {
			height: 470px;
		}

		.icon-label {
			font-size: 0.65rem;
		}

		.icon-box {
			width: 40px;
			height: 40px;
		}

		.icon-box svg {
			width: 20px;
			height: 20px;
		}

		.binary-column {
			font-size: 12px;
		}
	}
</style>
