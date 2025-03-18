<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getPeerConnection, PeerJSConnection } from '$lib/PeerJSConnection.svelte';
	import { onMount } from 'svelte';
	import PeerComponent from '$lib/PeerComponent.svelte';
	import Drawer from '$lib/Drawer.svelte';
	import Icon from '@iconify/svelte';

	let peerConnection: PeerJSConnection | null = null;
	let usePen: boolean = true;
	onMount(() => {
		peerConnection = getPeerConnection();
		if (window.location.hash.startsWith('#server.')) {
			const serverID = window.location.hash.substring('#server.'.length);
			peerConnection.initHost(serverID);
		}
		if (window.location.hash.startsWith('#client.')) {
			const serverID = window.location.hash.substring('#client.'.length);
			peerConnection.initClient(serverID);
		}
		peerConnection.onConnectionSubscriber.push(() => {
			const mode = peerConnection.isServer ? 'server' : 'client';
			window.location.hash = `#${mode}.${peerConnection.serverID}`;
		});
	});

	function handlePen() {
		usePen = true;
		console.log('pen');
	}
	function handleEraser() {
		usePen = false;
		console.log('eraser');
	}
	function handleFullScreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch((err) => {
				console.log(`Error attempting to enable fullscreen: ${err.message}`);
			});
		} else {
			document.exitFullscreen();
		}
	}
</script>

<div class="container">
	{#if !peerConnection || !peerConnection.$ready}
		<div out:fade style="z-index:100;">
			<PeerComponent />
		</div>
	{:else}
		<div in:fade>
			<nav>
				<div class="nav-part">
					<button disabled={usePen} on:click={handlePen}>
						<Icon icon="mdi:pen" />
					</button>
					<button disabled={!usePen} on:click={handleEraser}>
						<Icon icon="mdi:eraser" />
					</button>
				</div>
				<div class="nav-part">
					{#each peerConnection.connections}
						<div class="circle">
							<Icon icon="mdi:account" />
						</div>
					{/each}
					<button on:click={handleFullScreen}>
						<Icon icon="mdi:fullscreen" />
					</button>
					<button>
						<Icon icon="mdi:share" />
					</button>
				</div>
			</nav>
			<Drawer />
		</div>
	{/if}
</div>

<style>
	.container {
		display: grid;
	}
	.container > div {
		grid-column: 1;
		grid-row: 1;
	}
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	nav div {
		display: flex;
		align-items: center;
		gap: 1em;
	}
	.circle {
		width: 2.4em;
		height: 2.4em;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #2ebb2e;
		color: var(--fg-1);
		border-radius: 50%;
	}
</style>
