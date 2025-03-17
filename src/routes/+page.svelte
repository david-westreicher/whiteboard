
<style>
    canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
        touch-action: none;
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
    import {LineRenderer, Line} from '$lib/LineRenderer'

    const PEER_HOST = "192.168.0.164";
    let canvas;
    let scene, camera, renderer, animationFrameId;
    const globalConnections = [];
    let mouseDown = false;
    let middleMouseDown = false;
    let rightMouseDown = false;
    let mousePos = {x: 0, y: 0};
    let windowPos = {x: 0, y: 0};
    const lineRenderer = new LineRenderer();
    const currentLineRenderer = new LineRenderer("", 0xff7700);
    let currentLine;
    let presenter;

    function initScene() {
        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(0,window.innerWidth, 0,window.innerHeight,-1, 1);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

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
        presenter = await navigator.ink.requestPresenter({presentationArea: canvas});
        if (typeof window !== "undefined") {
            initScene();
            window.addEventListener("resize", resizeCanvas);
            resizeCanvas();
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
    function handleMouseUp(event){
        mouseDown = false;
        middleMouseDown = false;
        rightMouseDown = false;
        windowPos.x = camera.position.x;
        windowPos.y = camera.position.y;
        if (currentLine && currentLine.positions.length > 0) {
            const lineID = lineRenderer.addLine(currentLine);
            globalConnections.forEach(conn => {
                conn.send(["add-line", lineID, currentLine]);
            });
            currentLine = null;
        }
    }
    function handleMouseMove(event){
        //TODO const s_button_press = event.button === 1 && event.pressure === 0;
        if (!event.isPrimary ) return;
        if (middleMouseDown){
            camera.position.x = -event.x + mousePos.x + windowPos.x;
            camera.position.y = -event.y + mousePos.y + windowPos.y;
        }
        if (rightMouseDown){
            const removedLines = lineRenderer.erase(new THREE.Vector3(event.x + camera.position.x, event.y + camera.position.y));
            if (removedLines.length > 0) {
                globalConnections.forEach(conn => {
                    conn.send(["remove-lines", removedLines]);
                });
            }
        }
        if (!mouseDown) return;
        presenter.updateInkTrailStartPoint(event, {
            color: "#FF7700",
            diameter: 5
        });
        if (currentLine)
            //TODO: for (event of event.getCoalescedEvents())
            currentLine.positions.push(new THREE.Vector3(event.x + camera.position.x, event.y + camera.position.y, event.pressure))
    }

    function receiveData(data, peer){
        const operation = data[0];
        if (operation === "bulk"){
            const [op, lines] = data;
            Object.entries(lines).forEach(
                ([lineID, line]) => lineRenderer.addLine(line, lineID)
            );
        } else if(operation === "add-line") {
            const [op, lineID, line] = data;
            lineRenderer.addLine(line, lineID);
        } else if(operation === "remove-lines") {
            const [op, lineIDs] = data;
            for (let lineID of lineIDs) {
                lineRenderer.removeLine(lineID);
            }
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
        lineRenderer.id = 'asd';
        console.log("i'm server")
        peer.on("connection", (conn) => {
            console.log("connection opened");
            globalConnections.push(conn);
            conn.on("data", (data) => receiveData(data, conn.peer));
            setTimeout(() => {
                conn.send(["bulk", lineRenderer.lines])
            }, 100);
        });
    }
    function handleClient(){
        const peer = new PEER({'host':PEER_HOST, 'port':9000});
        console.log("i'm client")
        peer.on("open", (id) => {
            lineRenderer.id = id;
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
    on:pointerdown={handleMouseDown}
    on:pointermove={handleMouseMove}
    on:pointerup={handleMouseUp}
    on:pointerleave={handleMouseUp}
    on:contextmenu|preventDefault
    on:touchmove|preventDefault
></canvas>
<div class="buttons">
    <button on:click={handleServer}>Server</button>
    <button on:click={handleClient}>Client</button>
</div>
