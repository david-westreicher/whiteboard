<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getPeerConnection, PeerJSConnection } from '$lib/PeerJSConnection.svelte';
	import { onMount } from 'svelte';
	import PeerComponent from '$lib/PeerComponent.svelte';
	import Drawer from '$lib/Drawer.svelte';
	import Icon from '@iconify/svelte';

	let peerConnection: PeerJSConnection | null = null;
	onMount(() => {
		peerConnection = getPeerConnection();
	});
</script>

<div class="container">
	{#if !peerConnection || !peerConnection.$ready}
		<div out:fade style="z-index:100;">
			<PeerComponent />
		</div>
	{:else}
		<div in:fade>
			<nav>
				<a href="/">
					<button>
						<Icon icon="mdi:share" />
					</button>
				</a>
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
</style>
