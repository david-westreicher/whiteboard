<script lang="ts">
	import { getPeerConnection, PeerJSConnection } from '$lib/PeerJSConnection.svelte';
	import { onMount } from 'svelte';

	let peerConnection: PeerJSConnection | null = null;
	let peerID: string = '';
	let connecting: boolean = false;
	onMount(() => {});

	function handleHost() {
		connecting = true;
		peerConnection = getPeerConnection();
		console.log(peerConnection.$id);
		peerConnection.initHost((id) => {
			console.log(id);
			connecting = false;
		});
	}
	function handleClient() {
		connecting = true;
		peerConnection = getPeerConnection();
		peerConnection.onConnectionSubscriber.push((_: any) => {
			console.log('connected');
			connecting = false;
		});
		peerConnection.initClient(peerID, (id) => {
			console.log(id);
		});
	}
</script>

<div role="presentation" class="modal-background">
	<div class="menu">
		<button on:click={handleHost} disabled={connecting}> HOST </button>
		<hr />
		<input bind:value={peerID} placeholder="XXXX-XXXX-XXXX-XXXX" disabled={connecting} />
		<button on:click={handleClient} disabled={connecting}> JOIN </button>
	</div>
</div>

<style>
	.modal-background {
		position: fixed;
		display: flex;
		justify-content: center;
		align-items: center;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		backdrop-filter: blur(20px);
	}
	.menu {
		position: relative;
		background: var(--bg-2);
		width: calc(100% - 2em);
		max-width: 28em;
		padding: 1em 1em 0.5em 1em;
		border-radius: 1em;
		box-sizing: border-box;
		user-select: none;
	}
	.menu input {
		display: flex;
		width: 100%;
		margin: 1em 0 0.5em 0;
		text-align: center;
	}
	.menu button {
		width: 100%;
	}
</style>
