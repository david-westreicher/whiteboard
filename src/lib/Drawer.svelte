<script lang="ts">
	import { getPeerConnection, PeerJSConnection } from '$lib/PeerJSConnection.svelte';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { LineRenderer, Line } from '$lib/LineRenderer';

	let canvas: any;
	let scene: THREE.Scene;
	let camera: THREE.Camera;
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number = 0;
	let mouseDown = false;
	let middleMouseDown = false;
	let rightMouseDown = false;
	let mousePos = { x: 0, y: 0 };
	let windowPos = { x: 0, y: 0 };
	let lineRenderer: LineRenderer;
	let peerConnection: PeerJSConnection | null = null;
	let globalConnections: any[] = [];
	const currentLineRenderer = new LineRenderer('', 0xff7700);
	let currentLine: Line | null;
	let presenter: any;

	function initScene() {
		// Scene setup
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(0, window.innerWidth, 0, window.innerHeight, -1, 1);
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setClearColor(0x2e2e2e, 1);
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);

		peerConnection = getPeerConnection();
		globalConnections = peerConnection.connections;
		peerConnection.onDataSubscriber.push(receiveData);
		if (peerConnection.isServer) {
			peerConnection.onConnectionSubscriber.push(sendBulk);
		}
		lineRenderer = new LineRenderer(peerConnection.$id, 0xffffff);
		scene.add(lineRenderer.mesh);
		scene.add(currentLineRenderer.mesh);
		animate();
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);
		currentLineRenderer.clear();
		if (currentLine && currentLine.positions.length > 0) {
			currentLineRenderer.addLine(currentLine);
		}
		renderer.render(scene, camera);
	}

	function resizeCanvas() {
		if (!renderer) return;
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.right = window.innerWidth;
		camera.bottom = window.innerHeight;
		camera.updateProjectionMatrix();
	}

	onMount(async () => {
		presenter = await navigator.ink.requestPresenter({ presentationArea: canvas });
		if (typeof window !== 'undefined') {
			initScene();
			window.addEventListener('resize', resizeCanvas);
			resizeCanvas();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', resizeCanvas);
			cancelAnimationFrame(animationFrameId);
			renderer.dispose();
		}
	});

	function handlePointerDown(event: PointerEvent) {
		if (event.button === 0 && event.isPrimary) {
			mouseDown = true;
			currentLine = new Line();
		} else if (event.button === 1 || !event.isPrimary) {
			middleMouseDown = true;
		} else if (event.button === 2) {
			rightMouseDown = true;
		}
		if (event.isPrimary) {
			mousePos.x = event.x;
			mousePos.y = event.y;
		}
	}
	function handlePointerUp(_: any) {
		mouseDown = false;
		middleMouseDown = false;
		rightMouseDown = false;
		windowPos.x = camera.position.x;
		windowPos.y = camera.position.y;
		if (currentLine && currentLine.positions.length > 0) {
			const lineID = lineRenderer.addLine(currentLine);
			globalConnections.forEach((conn) => {
				conn.send(['add-line', lineID, currentLine]);
			});
			currentLine = null;
		}
	}
	function handlePointerMove(event: any) {
		//TODO const s_button_press = event.button === 1 && event.pressure === 0;
		if (!event.isPrimary) return;
		if (middleMouseDown) {
			camera.position.x = -event.x + mousePos.x + windowPos.x;
			camera.position.y = -event.y + mousePos.y + windowPos.y;
		}
		if (rightMouseDown) {
			const removedLines = lineRenderer.erase(
				new THREE.Vector3(event.x + camera.position.x, event.y + camera.position.y)
			);
			if (removedLines.length > 0) {
				globalConnections.forEach((conn) => {
					conn.send(['remove-lines', removedLines]);
				});
			}
		}
		if (!mouseDown) return;
		presenter.updateInkTrailStartPoint(event, {
			color: '#FF7700',
			diameter: 5
		});
		if (currentLine)
			//TODO: for (event of event.getCoalescedEvents())
			currentLine.positions.push(
				new THREE.Vector3(event.x + camera.position.x, event.y + camera.position.y, event.pressure)
			);
	}

	function receiveData(data, peer) {
		console.log(data);
		const operation = data[0];
		if (operation === 'bulk') {
			const [op, lines] = data;
			for (let [lineID, line] of lines) {
				lineRenderer.addLine(line, lineID);
			}
		} else if (operation === 'add-line') {
			const [op, lineID, line] = data;
			lineRenderer.addLine(line, lineID);
		} else if (operation === 'remove-lines') {
			const [op, lineIDs] = data;
			for (let lineID of lineIDs) {
				lineRenderer.removeLine(lineID);
			}
		}
		if (peer) {
			globalConnections.forEach((conn) => {
				if (conn.peer !== peer) conn.send(data);
			});
		}
	}

	function sendBulk(conn: any) {
		console.log('send bulk');
		console.log(lineRenderer.lines);
		console.log(lineRenderer.lines.entries());
		conn.send(['bulk', Array.from(lineRenderer.lines.entries())]);
	}
</script>

<canvas
	bind:this={canvas}
	style="position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;"
	on:pointerdown={handlePointerDown}
	on:pointermove={handlePointerMove}
	on:pointerup={handlePointerUp}
	on:pointerleave={handlePointerUp}
	on:contextmenu|preventDefault
	on:touchmove|preventDefault
></canvas>

<style>
	canvas {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 0;
		touch-action: none;
	}
</style>
