import PEER from 'peerjs';
const PEER_HOST = "192.168.0.164";
import { writable } from 'svelte/store';


export class PeerJSConnection {
    peer: PEER;
    connections: any[] = [];
    host: string;
    port: int;
    $id: string = $state("");
    $ready: boolean = $state(false);
    isServer: boolean = false;
    onConnectionSubscriber: any[] = [console.log];
    onDataSubscriber: any[] = [];

    constructor(host: string, port :int, id?: string) {
        this.host = host;
        this.port = port;
    }

    initHost(
        onOpen: (id:string) => void,
    )
    {
        this.isServer = true;
        this.peer = new PEER(this.id || "asd", { host: this.host, port: this.port });
        this.peer.on('open', (id: string) => {
            this.$id = id;
			console.log(`peerjs connection opened ${id}`);
            onOpen(id);
            this.$ready = true;
        });
		this.peer.on('connection', (conn) => {
            this.setupConnection(conn);
		});
    }

    initClient(
        peerID: string,
        onOpen: (id:string) => void,
    )
    {
        this.isServer = false;
        this.peer = new PEER({ host: this.host, port: this.port });
        this.onConnectionSubscriber.push((conn)=>{
            this.$ready = true;
        })
        this.peer.on('open', (id) => {
            this.$id = id;
			console.log(`peerjs connection opened ${id}`);
            onOpen(id);
			console.log(`connect to ${peerID}`);
            const conn = this.peer.connect(peerID);
            this.setupConnection(conn);
        });
    }

    setupConnection(conn: any) {
        conn.on('open', () => {
            this.connections.push(conn);
            this.onConnectionSubscriber.forEach((subscriber) => {
                subscriber(conn);
            });
        });
        conn.on('data', (data) => {
            this.onDataSubscriber.forEach((subscriber) => {
                subscriber(data);
            });
        });
        conn.on('close', () => this.removeConnection(conn));
    }

    removeConnection(conn: Any) {
        console.log(`remove connection ${conn.peer}`);
        const index = this.connections.indexOf(conn);
        this.connections.splice(index, 1);
    }
}

let singletonPeerConnection = null;

export function getPeerConnection(): PeerJSConnection {
    if (singletonPeerConnection == null) {
        singletonPeerConnection = new PeerJSConnection(PEER_HOST, 9000);
    }
    return singletonPeerConnection;
}
