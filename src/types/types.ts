export interface Destination {
    id: number;
    pair_id: number;
    name: string;
    icao: string;
    iata: string;
    latitude: string;
    longitude: string;
    callsigns: string;
    types: string;
    distance: number;
    time: string;
}

export interface Route {
    id: number;
    name: string;
    icao: string;
    iata: string;
    base: boolean;
    latitude: string;
    longitude: string;
    destinations: Destination[];
    aircrafts: string[];
}

export interface Airport {
    name: string;
    destinations: { icao: string, time: string }[];
    aircrafts: string[];
}


export interface Trip {
    legs: { start: string, end: string }[]; // Array of legs
    destination: string; // Still store the final destination
}

export enum airlines {
    SPIRIT = "vspirit",
    AMERICAN = "vAAL",
    UNITED = "VirtUAL",
}
