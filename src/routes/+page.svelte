
<style>
    canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
    }

    .buttons {
        position: absolute;
        z-index: 1;
        top: 20px;
        left: 20px;
    }

    button {
        margin: 10px;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        background-color: rgba(200, 200, 200, 0.2);
        color: white;
        border-radius: 5px;
    }

    button:hover {
        background-color: rgba(0, 0, 0, 0.7);
    }
</style>

<script>
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import PEER from 'peerjs';
    import {LineRenderer} from '$lib/LineRenderer'


    const PEER_HOST = "192.168.0.164";
    const LINE_BUFFER_SIZE = 1000000;
    let canvas;
    let scene, camera, renderer, animationFrameId, lineGeometry;
    const globalConnections = [];
    let mouseDown = false;
    let middleMouseDown = false;
    let mousePos = {x: 0, y: 0};
    let windowPos = {x: 0, y: 0};
    let linebuffer = new Float32Array( LINE_BUFFER_SIZE * 3 );
    let linebufferIndex = 0;
    const lineRenderer = new LineRenderer();

    function initScene() {
        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(0,window.innerWidth, 0,window.innerHeight,-10000, 10000);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });

        // Line geometry
        lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute( 'position', new THREE.BufferAttribute( linebuffer, 3 ) );
        const line = new THREE.LineSegments(lineGeometry, material);
        line.frustumCulled = false;
        scene.add(line);

        // Start animation loop
        animate();
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    function resizeCanvas() {
        if (!renderer) return;
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.right = window.innerWidth;
        camera.bottom = window.innerHeight;
        camera.updateProjectionMatrix();
    }

    onMount(() => {
        if (typeof window !== "undefined") {
            initScene();
            window.addEventListener("resize", resizeCanvas);
        }
    });

    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
        }
    });

    function handleMouseDown(event){
        if (event.button === 0) {
            mouseDown = true;
        } else if (event.button === 1) {
            middleMouseDown = true;
        }
        mousePos.x = event.clientX;
        mousePos.y = event.clientY;
    }
    function handleMouseUp(event){
        mouseDown = false;
        middleMouseDown = false;
        windowPos.x = camera.position.x;
        windowPos.y = camera.position.y;
    }
    function handleMouseMove(event){
        if (middleMouseDown){
            camera.position.x = -event.clientX + mousePos.x + windowPos.x;
            camera.position.y = -event.clientY + mousePos.y + windowPos.y;
        }
        if (!mouseDown) return;
        linebuffer[linebufferIndex++] = mousePos.x + camera.position.x;
        linebuffer[linebufferIndex++] = mousePos.y + camera.position.y;
        linebuffer[linebufferIndex++] = 0;
        linebuffer[linebufferIndex++] = event.clientX + camera.position.x;
        linebuffer[linebufferIndex++] = event.clientY + camera.position.y;
        linebuffer[linebufferIndex++] = 0;
        linebufferIndex = linebufferIndex % (LINE_BUFFER_SIZE * 3);
        mousePos.x = event.clientX;
        mousePos.y = event.clientY;
        lineGeometry.attributes.position.addUpdateRange(linebufferIndex - 6, 6);
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.setDrawRange(0, linebufferIndex / 3);
        globalConnections.forEach(conn => {
            conn.send(linebuffer.subarray(linebufferIndex - 6, linebufferIndex))
        });
    }

    function receiveData(data, peer){
        console.log(data, peer)
        const floats = new Float32Array(data);
        for (let i = 0; i < floats.length; i+=3){
            linebuffer[linebufferIndex++] = floats[i];
            linebuffer[linebufferIndex++] = floats[i+1];
            linebuffer[linebufferIndex++] = floats[i+2];
            linebufferIndex = linebufferIndex % (LINE_BUFFER_SIZE * 3);
            lineGeometry.attributes.position.needsUpdate = true;
            lineGeometry.setDrawRange(0, linebufferIndex / 3);
        }
        if (peer) {
            globalConnections.forEach(conn => {
                if (conn.peer !== peer)
                    conn.send(data);
            });
        }
    }

    function handleServer(){
        const peer = new PEER('asd', {'host':PEER_HOST, 'port':9000});
        console.log("i'm server")
        peer.on("connection", (conn) => {
            console.log("connection opened");
            globalConnections.push(conn);
            conn.on("data", (data) => receiveData(data, conn.peer));
            setTimeout(() => {
                conn.send(linebuffer.subarray(0, linebufferIndex));
                console.log(conn.bufferSize);
            }, 100);
        });
    }
    function handleClient(){
        const peer = new PEER({'host':PEER_HOST, 'port':9000});
        console.log("i'm client")
        peer.on("open", (id) => {
            const conn = peer.connect('asd');
            conn.on("open", () => {
                conn.on("data", receiveData);
            });
            globalConnections.push(conn);
        })
    }
</script>

<canvas 
    bind:this={canvas}
    style="position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;"
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseUp}
></canvas>
<div class="buttons">
    <button on:click={handleServer}>Server</button>
    <button on:click={handleClient}>Client</button>
</div>
