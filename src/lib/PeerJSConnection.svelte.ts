import PEER from 'peerjs';
import { writable } from 'svelte/store';

const PEER_HOST = "whiteboard-454109.ew.r.appspot.com";
const PEER_PORT = 443

export class PeerJSConnection {
    connections: any[] = $state([]);
    $id: string = $state("");
    $ready: boolean = $state(false);
    peer: PEER;
    host: string;
    port: number;
    serverID: string = "";
    isServer: boolean = false;
    onConnectionSubscriber: any[] = [console.log];
    onDataSubscriber: any[] = [];

    constructor(host: string, port :number) {
        this.host = host;
        this.port = port;
    }

    initHost(serverID?: string)
    {
        console.log(serverID)
        this.isServer = true;
        if (serverID){
            this.peer = new PEER(serverID, { host: this.host, port: this.port });
        }else{
            this.peer = new PEER({ host: this.host, port: this.port });
        }
        this.peer.on('open', (id: string) => {
            this.$id = id;
            this.serverID = id;
            this.onConnectionSubscriber.forEach((subscriber) => {
                subscriber();
            });
			console.log(`peerjs connection opened ${id}`);
            this.$ready = true;
        });
		this.peer.on('connection', (conn) => {
            this.setupConnection(conn);
		});
    }

    initClient(serverID: string)
    {
        this.isServer = false;
        this.serverID = serverID;
        this.peer = new PEER({ host: this.host, port: this.port });
        this.onConnectionSubscriber.push((conn: any)=>{
            this.$ready = true;
        })
        this.peer.on('open', (id) => {
            this.$id = id;
			console.log(`peerjs connection opened ${id}`);
			console.log(`connect to ${serverID}`);
            const conn = this.peer.connect(serverID);
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
        conn.on('data', (data: any) => {
            this.onDataSubscriber.forEach((subscriber) => {
                let peer = this.isServer ? conn.peer : undefined;
                subscriber(data, peer);
            });
        });
        conn.on('close', () => this.removeConnection(conn));
    }

    removeConnection(conn: any) {
        console.log(`remove connection ${conn.peer}`);
        const index = this.connections.indexOf(conn);
        this.connections.splice(index, 1);
    }
}

let singletonPeerConnection: PeerJSConnection|null = null;

export function getPeerConnection(): PeerJSConnection {
    if (singletonPeerConnection == null) {
        singletonPeerConnection = new PeerJSConnection(PEER_HOST, PEER_PORT);
    }
    return singletonPeerConnection;
}
